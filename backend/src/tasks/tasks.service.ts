import {
  Injectable,
  Inject,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, or } from 'drizzle-orm';
import { SyncGateway } from '../sync/sync.gateway';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private syncGateway: SyncGateway,
    private notificationsService: NotificationsService,
  ) { }

  async create(
    title: string,
    description: string,
    assignedBy: string,
    responsibleOwner: string,
    participants: { userId: string; role: string }[] = [],
    milestones: string[] = [],
    priority: string = 'MEDIUM',
  ) {
    const taskDetails = await this.db.transaction(async (tx) => {
      const [task] = await tx
        .insert(schema.tasks)
        .values({
          title,
          description,
          assignedBy,
          responsibleOwner,
          status: 'PENDING',
          priority: (priority as any) || 'MEDIUM',
        })
        .returning();

      // Create assignment notification directly in tx
      await tx.insert(schema.notifications).values({
        userId: responsibleOwner,
        taskId: task.id,
        type: 'ASSIGNED',
        content: `You have been assigned as the responsible owner for "${title}"`,
        isRead: 'false',
      });

      // Add additional participants if any
      if (participants && participants.length > 0) {
        await tx.insert(schema.taskParticipants).values(
          participants.map((p) => ({
            taskId: task.id,
            userId: p.userId,
            role: p.role as any,
          })),
        );

        // Create participant notifications directly in tx
        await tx.insert(schema.notifications).values(
          participants.map((p) => ({
            userId: p.userId,
            taskId: task.id,
            type: 'PARTICIPANT_ADDED',
            content: `You have been added as a ${p.role} to "${title}"`,
            isRead: 'false',
          })),
        );
      }

      // Add milestones if any
      if (milestones && milestones.length > 0) {
        await tx.insert(schema.milestones).values(
          milestones.map((m) => ({
            taskId: task.id,
            title: m,
          })),
        );
      }

      // Log the creation
      await tx.insert(schema.syncLogs).values({
        taskId: task.id,
        userId: assignedBy,
        action: `Task created and assigned to ${responsibleOwner}`,
        metadata: { type: 'TASK_CREATED', responsibleOwner }
      });

      return task;
    });

    this.syncGateway.emitToTask(taskDetails.id, 'task:created', taskDetails);

    // Emit realtime notification to the specific user (best effort outside transaction)
    this.syncGateway.server
      .to(`user:${responsibleOwner}`)
      .emit('notification:new', {
        userId: responsibleOwner,
        taskId: taskDetails.id,
        type: 'ASSIGNED',
        content: `You have been assigned as the responsible owner for "${title}"`,
        isRead: 'false',
      });

    // Add additional participants if any
    if (participants && participants.length > 0) {
      participants.forEach((p) => {
        this.syncGateway.server.to(`user:${p.userId}`).emit('notification:new', {
          userId: p.userId,
          taskId: taskDetails.id,
          type: 'PARTICIPANT_ADDED',
          content: `You have been added as a ${p.role} to "${title}"`,
          isRead: 'false',
        });
      });
    }

    return taskDetails;
  }

  async addMilestone(taskId: string, title: string, userId: string, dueDate?: string) {
    const [milestone] = await this.db
      .insert(schema.milestones)
      .values({
        taskId,
        title,
        dueDate: dueDate ? new Date(dueDate) : null,
      })
      .returning();

    await this.logAction(taskId, userId, `Milestone added: ${title}${dueDate ? ` (Due: ${dueDate})` : ''}`, {
      type: 'MILESTONE_ADDED',
      milestoneTitle: title,
      dueDate: dueDate || null
    });
    this.syncGateway.emitToTask(taskId, 'milestone:created', milestone);
    return milestone;
  }

  async updateMilestone(
    milestoneId: string,
    data: { title?: string; dueDate?: string; isCompleted?: boolean },
    userId: string,
  ) {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.dueDate !== undefined)
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.isCompleted !== undefined)
      updateData.isCompleted = data.isCompleted ? 'true' : 'false';

    const [milestone] = await this.db
      .update(schema.milestones)
      .set(updateData)
      .where(eq(schema.milestones.id, milestoneId))
      .returning();

    await this.logAction(
      milestone.taskId,
      userId,
      `Milestone updated: ${milestone.title}`,
      { type: 'MILESTONE_UPDATED', milestoneId, milestoneTitle: milestone.title, data }
    );
    this.syncGateway.emitToTask(
      milestone.taskId,
      'milestone:updated',
      milestone,
    );
    return milestone;
  }

  async deleteMilestone(milestoneId: string, userId: string) {
    const [milestone] = await this.db
      .delete(schema.milestones)
      .where(eq(schema.milestones.id, milestoneId))
      .returning();

    if (milestone) {
      await this.logAction(
        milestone.taskId,
        userId,
        `Milestone deleted: ${milestone.title}`,
        { type: 'MILESTONE_DELETED', milestoneId, milestoneTitle: milestone.title }
      );
      this.syncGateway.emitToTask(milestone.taskId, 'milestone:deleted', {
        id: milestoneId,
      });
    }

    return { success: true };
  }

  async toggleMilestone(
    milestoneId: string,
    isCompleted: boolean,
    userId: string,
  ) {
    return this.updateMilestone(milestoneId, { isCompleted }, userId);
  }

  async logTime(
    taskId: string,
    userId: string,
    durationMinutes: number | string,
    description: string,
  ) {
    const duration = durationMinutes.toString();
    const [log] = await this.db
      .insert(schema.timeLogs)
      .values({
        taskId,
        userId,
        durationMinutes: duration,
        description,
      })
      .returning();

    await this.logAction(
      taskId,
      userId,
      `Logged ${duration} mins: ${description}`,
      { type: 'TIME_LOGGED', durationMinutes: duration, description }
    );
    this.syncGateway.emitToTask(taskId, 'timelog:created', log);
    return log;
  }

  async accept(taskId: string, userId: string) {
    const task = await this.db.query.tasks.findFirst({
      where: eq(schema.tasks.id, taskId),
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.responsibleOwner !== userId)
      throw new UnauthorizedException(
        'Only the responsible owner can accept the task',
      );
    if (task.status !== 'PENDING')
      throw new BadRequestException('Task is not in PENDING state');

    const [updatedTask] = await this.db
      .update(schema.tasks)
      .set({
        status: 'ACTIVE',
        lastUpdatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, taskId))
      .returning();

    await this.logAction(taskId, userId, 'Responsibility accepted', { type: 'TASK_ACCEPTED' });

    this.syncGateway.emitToTask(taskId, 'task:accepted', updatedTask);

    return updatedTask;
  }

  async complete(taskId: string, userId: string) {
    const task = await this.db.query.tasks.findFirst({
      where: eq(schema.tasks.id, taskId),
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.assignedBy !== userId) {
      throw new UnauthorizedException(
        'Only the assigner can mark the track as complete',
      );
    }

    const [updatedTask] = await this.db
      .update(schema.tasks)
      .set({
        status: 'COMPLETED' as any,
        completedAt: new Date(),
        lastUpdatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, taskId))
      .returning();

    await this.logAction(taskId, userId, 'Track marked as COMPLETED', { type: 'TASK_COMPLETED' });
    this.syncGateway.emitToTask(taskId, 'task:completed', updatedTask);

    return updatedTask;
  }

  async updateSyncState(
    taskId: string,
    userId: string,
    syncState: 'IN_SYNC' | 'NEEDS_UPDATE' | 'BLOCKED' | 'HELP_REQUESTED',
    note?: string,
  ) {
    const participant = await this.db.query.taskParticipants.findFirst({
      where: and(
        eq(schema.taskParticipants.taskId, taskId),
        eq(schema.taskParticipants.userId, userId),
      ),
    });

    const task = await this.db.query.tasks.findFirst({
      where: eq(schema.tasks.id, taskId),
    });

    if (!participant && task?.responsibleOwner !== userId) {
      throw new UnauthorizedException(
        'Not authorized to update sync state for this task',
      );
    }

    if (participant) {
      await this.db
        .update(schema.taskParticipants)
        .set({ syncState })
        .where(eq(schema.taskParticipants.id, participant.id));
    }

    if (task?.responsibleOwner === userId) {
      await this.db
        .update(schema.tasks)
        .set({
          syncState,
          lastUpdatedAt: new Date(),
        })
        .where(eq(schema.tasks.id, taskId));

      // Trigger notification if help requested by Owner
      if (syncState === 'HELP_REQUESTED') {
        const fullTask = await this.findOne(taskId);
        if (fullTask) {
          const log = await this.logAction(taskId, userId, `Sync state updated to ${syncState}${note ? `: ${note}` : ''}`, {
            oldState: task?.syncState,
            newState: syncState,
            note: note || null
          });

          await this.notificationsService.create(
            fullTask.assignedBy,
            taskId,
            'HELP_REQUESTED',
            `Help requested on "${fullTask.title}" by ${fullTask.owner?.name}`,
            log.id
          );

          this.syncGateway.emitToTask(taskId, 'sync:update', {
            taskId,
            userId,
            syncState,
            activityId: log.id
          });
          return { success: true, syncState, activityId: log.id };
        }
      }
    }

    const log = await this.logAction(taskId, userId, `Sync state updated to ${syncState}${note ? `: ${note}` : ''}`, {
      oldState: task?.syncState,
      newState: syncState,
      note: note || null
    });

    this.syncGateway.emitToTask(taskId, 'sync:update', {
      taskId,
      userId,
      syncState,
      activityId: log.id
    });

    return { success: true, syncState, activityId: log.id };
  }

  // ─── 3-STEP RESPONSIBILITY TRANSFER ─────────────────────

  /** Step 1: Current owner initiates transfer → creates PENDING record, task goes TRANSFER_PENDING */
  async initiateTransfer(taskId: string, currentOwnerId: string, newOwnerId: string, reason?: string) {
    const task = await this.db.query.tasks.findFirst({
      where: eq(schema.tasks.id, taskId),
      with: { owner: true },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.responsibleOwner !== currentOwnerId)
      throw new UnauthorizedException('Only the current responsible owner can initiate a transfer');
    if (task.status === 'TRANSFER_PENDING')
      throw new BadRequestException('A transfer is already pending for this task');
    if (currentOwnerId === newOwnerId)
      throw new BadRequestException('Cannot transfer to yourself');

    // Check target user exists
    const targetUser = await this.db.query.users.findFirst({
      where: eq(schema.users.id, newOwnerId),
    });
    if (!targetUser) throw new NotFoundException('Target user not found');

    const result = await this.db.transaction(async (tx) => {
      // 1. Create transfer record
      const [transfer] = await tx
        .insert(schema.responsibilityTransfers)
        .values({
          taskId,
          fromUserId: currentOwnerId,
          toUserId: newOwnerId,
          status: 'PENDING',
          reason: reason || null,
        })
        .returning();

      // 2. Set task to TRANSFER_PENDING (original owner stays as responsibleOwner until accepted)
      await tx
        .update(schema.tasks)
        .set({
          status: 'TRANSFER_PENDING',
          lastUpdatedAt: new Date(),
        })
        .where(eq(schema.tasks.id, taskId));

      // 3. Log the action
      await tx.insert(schema.syncLogs).values({
        taskId,
        userId: currentOwnerId,
        action: `Responsibility transfer initiated to ${targetUser.name}`,
        metadata: { type: 'TRANSFER_INITIATED', toUserId: newOwnerId, transferId: transfer.id },
      });

      // 4. Notification for new owner
      await tx.insert(schema.notifications).values({
        userId: newOwnerId,
        taskId,
        type: 'TRANSFER_INITIATED',
        content: `${task.owner?.name || 'Someone'} wants to transfer responsibility for "${task.title}" to you.`,
        isRead: 'false',
      });

      return transfer;
    });

    // Emit realtime events
    this.syncGateway.emitToTask(taskId, 'task:transfer:initiated', {
      transferId: result.id,
      taskId,
      from: currentOwnerId,
      fromName: task.owner?.name,
      to: newOwnerId,
      toName: targetUser.name,
    });
    this.syncGateway.server.to(`user:${newOwnerId}`).emit('notification:new', {
      type: 'TRANSFER_INITIATED',
      taskId,
    });

    return result;
  }

  /** Step 2a: New owner accepts the transfer → ownership swaps, task goes ACTIVE */
  async acceptTransfer(transferId: string, userId: string) {
    const transfer = await this.db.query.responsibilityTransfers.findFirst({
      where: eq(schema.responsibilityTransfers.id, transferId),
      with: { task: true, fromUser: true, toUser: true },
    });

    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.toUserId !== userId)
      throw new UnauthorizedException('Only the target user can accept this transfer');
    if (transfer.status !== 'PENDING')
      throw new BadRequestException('This transfer is no longer pending');

    await this.db.transaction(async (tx) => {
      // 1. Update transfer record
      await tx
        .update(schema.responsibilityTransfers)
        .set({ status: 'ACCEPTED', resolvedAt: new Date() })
        .where(eq(schema.responsibilityTransfers.id, transferId));

      // 2. Swap ownership on the task → set ACTIVE
      await tx
        .update(schema.tasks)
        .set({
          responsibleOwner: userId,
          status: 'ACTIVE',
          syncState: 'IN_SYNC',
          lastUpdatedAt: new Date(),
        })
        .where(eq(schema.tasks.id, transfer.taskId));

      // 3. Log events
      await tx.insert(schema.syncLogs).values({
        taskId: transfer.taskId,
        userId,
        action: `Responsibility transfer accepted from ${transfer.fromUser?.name}`,
        metadata: { type: 'TRANSFER_ACCEPTED', transferId, fromUserId: transfer.fromUserId },
      });

      // 4. Notify old owner
      await tx.insert(schema.notifications).values({
        userId: transfer.fromUserId,
        taskId: transfer.taskId,
        type: 'TRANSFER_ACCEPTED',
        content: `${transfer.toUser?.name} accepted responsibility for "${transfer.task?.title}".`,
        isRead: 'false',
      });
    });

    // Emit realtime
    this.syncGateway.emitToTask(transfer.taskId, 'task:transfer:accepted', {
      transferId,
      taskId: transfer.taskId,
      newOwner: userId,
    });
    this.syncGateway.server.to(`user:${transfer.fromUserId}`).emit('notification:new', {
      type: 'TRANSFER_ACCEPTED',
      taskId: transfer.taskId,
    });

    return { success: true, transferId };
  }

  /** Step 2b: New owner rejects the transfer → task reverts to ACTIVE, old owner stays */
  async rejectTransfer(transferId: string, userId: string) {
    const transfer = await this.db.query.responsibilityTransfers.findFirst({
      where: eq(schema.responsibilityTransfers.id, transferId),
      with: { task: true, fromUser: true, toUser: true },
    });

    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.toUserId !== userId)
      throw new UnauthorizedException('Only the target user can reject this transfer');
    if (transfer.status !== 'PENDING')
      throw new BadRequestException('This transfer is no longer pending');

    await this.db.transaction(async (tx) => {
      // 1. Update transfer record
      await tx
        .update(schema.responsibilityTransfers)
        .set({ status: 'REJECTED', resolvedAt: new Date() })
        .where(eq(schema.responsibilityTransfers.id, transferId));

      // 2. Revert task to ACTIVE (old owner stays)
      await tx
        .update(schema.tasks)
        .set({
          status: 'ACTIVE',
          lastUpdatedAt: new Date(),
        })
        .where(eq(schema.tasks.id, transfer.taskId));

      // 3. Log events
      await tx.insert(schema.syncLogs).values({
        taskId: transfer.taskId,
        userId,
        action: `Responsibility transfer rejected`,
        metadata: { type: 'TRANSFER_REJECTED', transferId, fromUserId: transfer.fromUserId },
      });

      // 4. Notify old owner
      await tx.insert(schema.notifications).values({
        userId: transfer.fromUserId,
        taskId: transfer.taskId,
        type: 'TRANSFER_REJECTED',
        content: `${transfer.toUser?.name} rejected responsibility for "${transfer.task?.title}".`,
        isRead: 'false',
      });
    });

    // Emit realtime
    this.syncGateway.emitToTask(transfer.taskId, 'task:transfer:rejected', {
      transferId,
      taskId: transfer.taskId,
    });
    this.syncGateway.server.to(`user:${transfer.fromUserId}`).emit('notification:new', {
      type: 'TRANSFER_REJECTED',
      taskId: transfer.taskId,
    });

    return { success: true, transferId };
  }

  /** Cancel a pending transfer (by the initiator/old owner) */
  async cancelTransfer(transferId: string, userId: string) {
    const transfer = await this.db.query.responsibilityTransfers.findFirst({
      where: eq(schema.responsibilityTransfers.id, transferId),
      with: { task: true, toUser: true },
    });

    if (!transfer) throw new NotFoundException('Transfer not found');
    if (transfer.fromUserId !== userId)
      throw new UnauthorizedException('Only the initiator can cancel this transfer');
    if (transfer.status !== 'PENDING')
      throw new BadRequestException('This transfer is no longer pending');

    await this.db.transaction(async (tx) => {
      await tx
        .update(schema.responsibilityTransfers)
        .set({ status: 'CANCELLED', resolvedAt: new Date() })
        .where(eq(schema.responsibilityTransfers.id, transferId));

      await tx
        .update(schema.tasks)
        .set({ status: 'ACTIVE', lastUpdatedAt: new Date() })
        .where(eq(schema.tasks.id, transfer.taskId));

      await tx.insert(schema.syncLogs).values({
        taskId: transfer.taskId,
        userId,
        action: `Responsibility transfer cancelled`,
        metadata: { type: 'TRANSFER_CANCELLED', transferId },
      });
    });

    this.syncGateway.emitToTask(transfer.taskId, 'task:transfer:cancelled', {
      transferId,
      taskId: transfer.taskId,
    });

    return { success: true, transferId };
  }

  /** Get pending transfers for a user (incoming) */
  async getPendingTransfersForUser(userId: string) {
    return this.db.query.responsibilityTransfers.findMany({
      where: and(
        eq(schema.responsibilityTransfers.toUserId, userId),
        eq(schema.responsibilityTransfers.status, 'PENDING'),
      ),
      with: {
        task: true,
        fromUser: true,
      },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  /** Get the active (PENDING) transfer record for a task, if any */
  async getActiveTransferForTask(taskId: string) {
    return this.db.query.responsibilityTransfers.findFirst({
      where: and(
        eq(schema.responsibilityTransfers.taskId, taskId),
        eq(schema.responsibilityTransfers.status, 'PENDING'),
      ),
      with: {
        fromUser: true,
        toUser: true,
      },
    });
  }

  async nudge(taskId: string, userId: string) {
    const task = await this.db.query.tasks.findFirst({
      where: eq(schema.tasks.id, taskId),
      with: {
        owner: true,
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.assignedBy !== userId) {
      throw new UnauthorizedException(
        'Only the assigner can nudge the responsible owner',
      );
    }

    // 2. Log Action
    const log = await this.logAction(
      taskId,
      userId,
      `Nudged responsible owner (${task.owner?.name})`,
      { type: 'NUDGE' }
    );

    // 1. Create Notification (Moved after log to get activityId)
    await this.notificationsService.create(
      task.responsibleOwner,
      taskId,
      'NUDGE',
      `You've been nudged on "${task.title}" by the assigner.`,
      log.id
    );

    // 3. Emit Realtime Event
    this.syncGateway.emitToTask(taskId, 'task:nudge', {
      taskId,
      nudgedBy: userId,
      nudgedUser: task.responsibleOwner,
      activityId: log.id
    });

    return { success: true };
  }

  async addParticipant(
    taskId: string,
    userId: string,
    role: string,
    addedBy: string,
  ) {
    const [participant] = await this.db
      .insert(schema.taskParticipants)
      .values({
        taskId,
        userId,
        role: role as any,
      })
      .returning();

    await this.logAction(taskId, addedBy, `User ${userId} added as ${role}`, {
      type: 'PARTICIPANT_ADDED',
      addedUserId: userId,
      role
    });

    this.syncGateway.emitToTask(taskId, 'task:join', { userId, role });

    // Notification for new participant
    const task = await this.db.query.tasks.findFirst({
      where: eq(schema.tasks.id, taskId),
    });
    if (task) {
      await this.notificationsService.create(
        userId,
        taskId,
        'PARTICIPANT_ADDED',
        `You have been added as a ${role} to "${task.title}"`,
      );
    }

    return participant;
  }

  async removeParticipant(taskId: string, userId: string, removedBy: string) {
    const [participant] = await this.db
      .delete(schema.taskParticipants)
      .where(
        and(
          eq(schema.taskParticipants.taskId, taskId),
          eq(schema.taskParticipants.userId, userId),
        ),
      )
      .returning();

    if (participant) {
      await this.logAction(taskId, removedBy, `User ${userId} removed from task`, {
        type: 'PARTICIPANT_REMOVED',
        removedUserId: userId
      });
      this.syncGateway.emitToTask(taskId, 'task:leave', { userId });
    }

    return { success: true };
  }

  async findAllForUser(userId: string) {
    const ownedTasks = await this.db.query.tasks.findMany({
      where: or(
        eq(schema.tasks.responsibleOwner, userId),
        eq(schema.tasks.assignedBy, userId),
      ),
      with: {
        assigner: true,
        owner: true,
        participants: {
          with: {
            user: true,
          },
        },
        milestones: true,
        timeLogs: {
          with: {
            user: true,
          },
        },
      },
    });

    const participatedTasks = await this.db.query.taskParticipants.findMany({
      where: eq(schema.taskParticipants.userId, userId),
      with: {
        task: {
          with: {
            assigner: true,
            owner: true,
            participants: {
              with: {
                user: true,
              },
            },
            milestones: true,
            timeLogs: {
              with: {
                user: true,
              },
            },
          },
        },
      },
    });

    // Unique tasks by ID
    const taskMap = new Map();
    ownedTasks.forEach((t) => taskMap.set(t.id, t));
    participatedTasks.forEach((p) => {
      if (!taskMap.has(p.taskId)) {
        taskMap.set(p.taskId, p.task);
      }
    });

    return Array.from(taskMap.values());
  }

  async update(taskId: string, userId: string, data: { title?: string; description?: string; status?: string; priority?: string }) {
    const task = await this.db.query.tasks.findFirst({
      where: eq(schema.tasks.id, taskId),
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.assignedBy !== userId && task.responsibleOwner !== userId) {
      throw new UnauthorizedException('Not authorized to update this task');
    }

    const [updatedTask] = await this.db
      .update(schema.tasks)
      .set({
        ...data,
        lastUpdatedAt: new Date(),
      } as any)
      .where(eq(schema.tasks.id, taskId))
      .returning();

    await this.logAction(taskId, userId, `Task updated: ${Object.keys(data).join(', ')}`, {
      type: 'TASK_UPDATED',
      updates: data
    });
    this.syncGateway.emitToTask(taskId, 'task:updated', updatedTask);
    return updatedTask;
  }

  async delete(taskId: string, userId: string) {
    const task = await this.db.query.tasks.findFirst({
      where: eq(schema.tasks.id, taskId),
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.assignedBy !== userId) {
      throw new UnauthorizedException('Only the assigner can delete the task');
    }

    await this.db.transaction(async (tx) => {
      // Delete dependent records
      await tx.delete(schema.milestones).where(eq(schema.milestones.taskId, taskId));
      await tx.delete(schema.taskParticipants).where(eq(schema.taskParticipants.taskId, taskId));
      await tx.delete(schema.timeLogs).where(eq(schema.timeLogs.taskId, taskId));
      await tx.delete(schema.syncLogs).where(eq(schema.syncLogs.taskId, taskId));
      await tx.delete(schema.notifications).where(eq(schema.notifications.taskId, taskId));
      await tx.delete(schema.taskComments).where(eq(schema.taskComments.taskId, taskId));

      // Delete the task
      await tx.delete(schema.tasks).where(eq(schema.tasks.id, taskId));
    });

    this.syncGateway.emitToTask(taskId, 'task:deleted', { id: taskId });
    return { success: true };
  }

  async addComment(taskId: string, userId: string, content: string) {
    const [comment] = await this.db
      .insert(schema.taskComments)
      .values({
        taskId,
        userId,
        content,
      })
      .returning();

    // Fetch full comment with user data
    const fullComment = await this.db.query.taskComments.findFirst({
      where: eq(schema.taskComments.id, comment.id),
      with: {
        user: true,
      },
    });

    const log = await this.logAction(taskId, userId, `New comment added: ${content}`, {
      type: 'COMMENT_ADDED',
      commentId: comment.id,
      snippet: content.substring(0, 100)
    });
    this.syncGateway.emitToTask(taskId, 'comment:new', { ...fullComment, activityId: log.id });
    return fullComment;
  }

  async getComments(taskId: string) {
    return this.db.query.taskComments.findMany({
      where: eq(schema.taskComments.taskId, taskId),
      with: {
        user: true,
      },
      orderBy: (comments, { asc }) => [asc(comments.createdAt)],
    });
  }

  async findOne(taskId: string) {
    return this.db.query.tasks.findFirst({
      where: eq(schema.tasks.id, taskId),
      with: {
        assigner: true,
        owner: true,
        participants: {
          with: {
            user: true,
          },
        },
        milestones: true,
        timeLogs: {
          with: {
            user: true,
          },
        },
        comments: {
          with: {
            user: true,
          },
        },
        syncLogs: {
          with: {
            user: true,
          },
        },
      },
    });
  }

  async getUserStats(userId: string) {
    const ownedTasks = await this.db.query.tasks.findMany({
      where: eq(schema.tasks.responsibleOwner, userId),
    });

    const delegatedTasksCount = await this.db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.assignedBy, userId));

    const timeLogs = await this.db.query.timeLogs.findMany({
      where: eq(schema.timeLogs.userId, userId),
    });

    const stats = {
      active: ownedTasks.filter((t) => t.status === 'ACTIVE').length,
      pending: ownedTasks.filter((t) => t.status === 'PENDING').length,
      blocked: ownedTasks.filter((t) => t.syncState === 'BLOCKED').length,
      helpRequested: ownedTasks.filter((t) => t.syncState === 'HELP_REQUESTED')
        .length,
      delegated: delegatedTasksCount.length,
      totalTimeMins: timeLogs.reduce(
        (sum, log) => sum + parseInt(log.durationMinutes || '0'),
        0,
      ),
      syncStates: {
        IN_SYNC: ownedTasks.filter((t) => t.syncState === 'IN_SYNC').length,
        NEEDS_UPDATE: ownedTasks.filter((t) => t.syncState === 'NEEDS_UPDATE')
          .length,
        BLOCKED: ownedTasks.filter((t) => t.syncState === 'BLOCKED').length,
        HELP_REQUESTED: ownedTasks.filter(
          (t) => t.syncState === 'HELP_REQUESTED',
        ).length,
      },
    };

    return stats;
  }

  async syncParticipant(taskId: string, userId: string) {
    const participant = await this.db.query.taskParticipants.findFirst({
      where: and(
        eq(schema.taskParticipants.taskId, taskId),
        eq(schema.taskParticipants.userId, userId),
      ),
    });

    if (!participant) throw new NotFoundException('Participant record not found');

    await this.db
      .update(schema.taskParticipants)
      .set({
        syncState: 'IN_SYNC',
        lastUpdatedAt: new Date(),
      })
      .where(eq(schema.taskParticipants.id, participant.id));

    await this.logAction(
      taskId,
      userId,
      `Quick Sync: Participant (${participant.role}) state updated to IN_SYNC`,
      { type: 'SYNC_QUICK', role: participant.role }
    );

    this.syncGateway.emitToTask(taskId, 'sync:update', {
      taskId,
      userId,
      syncState: 'IN_SYNC',
    });

    return { success: true };
  }

  async syncAll(userId: string) {
    // 1. Sync owned tasks
    const ownedTasks = await this.db.query.tasks.findMany({
      where: eq(schema.tasks.responsibleOwner, userId),
    });

    const ownedSyncs = ownedTasks.map(async (task) => {
      if (task.syncState === 'IN_SYNC') return;

      await this.db
        .update(schema.tasks)
        .set({
          syncState: 'IN_SYNC',
          lastUpdatedAt: new Date(),
        })
        .where(eq(schema.tasks.id, task.id));

      await this.logAction(
        task.id,
        userId,
        'Global Sync: Owner state updated to IN_SYNC',
      );

      this.syncGateway.emitToTask(task.id, 'sync:update', {
        taskId: task.id,
        userId,
        syncState: 'IN_SYNC',
      });
    });

    // 2. Sync participated tasks
    const participations = await this.db.query.taskParticipants.findMany({
      where: eq(schema.taskParticipants.userId, userId),
    });

    const participantSyncs = participations.map(async (p) => {
      if (p.syncState === 'IN_SYNC') return;

      await this.db
        .update(schema.taskParticipants)
        .set({
          syncState: 'IN_SYNC',
          lastUpdatedAt: new Date(),
        })
        .where(eq(schema.taskParticipants.id, p.id));

      await this.logAction(
        p.taskId,
        userId,
        `Global Sync: Participant (${p.role}) state updated to IN_SYNC`,
      );

      this.syncGateway.emitToTask(p.taskId, 'sync:update', {
        taskId: p.taskId,
        userId,
        syncState: 'IN_SYNC',
      });
    });

    await Promise.all([...ownedSyncs, ...participantSyncs]);

    return {
      success: true,
      ownedCount: ownedTasks.length,
      participationCount: participations.length
    };
  }

  private async logAction(taskId: string, userId: string, action: string, metadata?: any) {
    const [log] = await this.db.insert(schema.syncLogs).values({
      taskId,
      userId,
      action,
      metadata,
    }).returning();
    return log;
  }
}

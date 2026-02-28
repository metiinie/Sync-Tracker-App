import { Injectable, Inject, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
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

    async create(title: string, description: string, assignedBy: string, responsibleOwner: string, participants: { userId: string, role: string }[] = [], milestones: string[] = []) {
        return await this.db.transaction(async (tx) => {
            const [task] = await tx.insert(schema.tasks).values({
                title,
                description,
                assignedBy,
                responsibleOwner,
                status: 'PENDING',
            }).returning();

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
                    participants.map(p => ({
                        taskId: task.id,
                        userId: p.userId,
                        role: p.role as any,
                    }))
                );

                // Create participant notifications directly in tx
                await tx.insert(schema.notifications).values(
                    participants.map(p => ({
                        userId: p.userId,
                        taskId: task.id,
                        type: 'PARTICIPANT_ADDED',
                        content: `You have been added as a ${p.role} to "${title}"`,
                        isRead: 'false',
                    }))
                );
            }

            // Add milestones if any
            if (milestones && milestones.length > 0) {
                await tx.insert(schema.milestones).values(
                    milestones.map(m => ({
                        taskId: task.id,
                        title: m,
                    }))
                );
            }

            // Log the creation
            await tx.insert(schema.syncLogs).values({
                taskId: task.id,
                userId: assignedBy,
                action: `Task created and assigned to ${responsibleOwner}`,
            });

            this.syncGateway.emitToTask(task.id, 'task:created', task);

            // Emit realtime notification to the specific user (best effort outside transaction)
            this.syncGateway.server.to(`user:${responsibleOwner}`).emit('notification:new', {
                userId: responsibleOwner,
                taskId: task.id,
                type: 'ASSIGNED',
            });

            return task;
        });
    }

    async addMilestone(taskId: string, title: string, userId: string) {
        const [milestone] = await this.db.insert(schema.milestones).values({
            taskId,
            title,
        }).returning();

        await this.logAction(taskId, userId, `Milestone added: ${title}`);
        this.syncGateway.emitToTask(taskId, 'milestone:created', milestone);
        return milestone;
    }

    async toggleMilestone(milestoneId: string, isCompleted: boolean, userId: string) {
        const [milestone] = await this.db.update(schema.milestones)
            .set({ isCompleted: isCompleted ? 'true' : 'false' })
            .where(eq(schema.milestones.id, milestoneId))
            .returning();

        await this.logAction(milestone.taskId, userId, `Milestone ${milestone.title} marked as ${isCompleted ? 'completed' : 'incomplete'}`);
        this.syncGateway.emitToTask(milestone.taskId, 'milestone:updated', milestone);
        return milestone;
    }

    async logTime(taskId: string, userId: string, durationMinutes: string, description: string) {
        const [log] = await this.db.insert(schema.timeLogs).values({
            taskId,
            userId,
            durationMinutes,
            description,
        }).returning();

        await this.logAction(taskId, userId, `Logged ${durationMinutes} mins: ${description}`);
        this.syncGateway.emitToTask(taskId, 'timelog:created', log);
        return log;
    }

    async accept(taskId: string, userId: string) {
        const task = await this.db.query.tasks.findFirst({
            where: eq(schema.tasks.id, taskId),
        });

        if (!task) throw new NotFoundException('Task not found');
        if (task.responsibleOwner !== userId) throw new UnauthorizedException('Only the responsible owner can accept the task');
        if (task.status !== 'PENDING') throw new BadRequestException('Task is not in PENDING state');

        const [updatedTask] = await this.db.update(schema.tasks)
            .set({
                status: 'ACTIVE',
                lastUpdatedAt: new Date()
            })
            .where(eq(schema.tasks.id, taskId))
            .returning();

        await this.logAction(taskId, userId, 'Responsibility accepted');

        this.syncGateway.emitToTask(taskId, 'task:accepted', updatedTask);

        return updatedTask;
    }

    async updateSyncState(taskId: string, userId: string, syncState: 'IN_SYNC' | 'NEEDS_UPDATE' | 'BLOCKED' | 'HELP_REQUESTED') {
        const participant = await this.db.query.taskParticipants.findFirst({
            where: and(
                eq(schema.taskParticipants.taskId, taskId),
                eq(schema.taskParticipants.userId, userId)
            ),
        });

        const task = await this.db.query.tasks.findFirst({
            where: eq(schema.tasks.id, taskId),
        });

        if (!participant && task?.responsibleOwner !== userId) {
            throw new UnauthorizedException('Not authorized to update sync state for this task');
        }

        if (participant) {
            await this.db.update(schema.taskParticipants)
                .set({ syncState })
                .where(eq(schema.taskParticipants.id, participant.id));
        }

        if (task?.responsibleOwner === userId) {
            await this.db.update(schema.tasks)
                .set({
                    syncState,
                    lastUpdatedAt: new Date()
                })
                .where(eq(schema.tasks.id, taskId));

            // Trigger notification if help requested by Owner
            if (syncState === 'HELP_REQUESTED') {
                const fullTask = await this.findOne(taskId);
                if (fullTask) {
                    await this.notificationsService.create(fullTask.assignedBy, taskId, 'HELP_REQUESTED', `Help requested on "${fullTask.title}" by ${fullTask.owner?.name}`);
                }
            }
        }

        await this.logAction(taskId, userId, `Sync state updated to ${syncState}`);

        this.syncGateway.emitToTask(taskId, 'sync:update', { taskId, userId, syncState });

        return { success: true, syncState };
    }

    async transfer(taskId: string, currentOwnerId: string, newOwnerId: string) {
        const task = await this.db.query.tasks.findFirst({
            where: eq(schema.tasks.id, taskId),
        });

        if (!task) throw new NotFoundException('Task not found');
        if (task.responsibleOwner !== currentOwnerId) throw new UnauthorizedException('Only the current responsible owner can transfer responsibility');

        const [updatedTask] = await this.db.update(schema.tasks)
            .set({
                responsibleOwner: newOwnerId,
                status: 'PENDING',
                lastUpdatedAt: new Date()
            })
            .where(eq(schema.tasks.id, taskId))
            .returning();

        await this.logAction(taskId, currentOwnerId, `Transfer initiated to ${newOwnerId}`);
        await this.logAction(taskId, newOwnerId, `Received responsibility (PENDING acceptance)`);

        this.syncGateway.emitToTask(taskId, 'task:transfer', { from: currentOwnerId, to: newOwnerId });

        // Notification for new owner
        await this.notificationsService.create(newOwnerId, taskId, 'TRANSFER_INITIATED', `Responsibility for "${task.title}" has been transferred to you.`);

        return updatedTask;
    }

    async addParticipant(taskId: string, userId: string, role: string, addedBy: string) {
        const [participant] = await this.db.insert(schema.taskParticipants).values({
            taskId,
            userId,
            role: role as any,
        }).returning();

        await this.logAction(taskId, addedBy, `User ${userId} added as ${role}`);

        this.syncGateway.emitToTask(taskId, 'task:join', { userId, role });

        // Notification for new participant
        const task = await this.db.query.tasks.findFirst({ where: eq(schema.tasks.id, taskId) });
        if (task) {
            await this.notificationsService.create(userId, taskId, 'PARTICIPANT_ADDED', `You have been added as a ${role} to "${task.title}"`);
        }

        return participant;
    }

    async findAllForUser(userId: string) {
        const ownedTasks = await this.db.query.tasks.findMany({
            where: or(
                eq(schema.tasks.responsibleOwner, userId),
                eq(schema.tasks.assignedBy, userId)
            ),
            with: {
                assigner: true,
                owner: true,
                participants: {
                    with: {
                        user: true
                    }
                },
                milestones: true,
                timeLogs: {
                    with: {
                        user: true
                    }
                },
                // The relation name in schema.ts is 'syncLogs' or there is no relation
                // 'logs' is not defined on tasksRelations
            }
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
                                user: true
                            }
                        },
                        milestones: true,
                        timeLogs: {
                            with: {
                                user: true
                            }
                        },
                    }
                }
            }
        });

        // Unique tasks by ID
        const taskMap = new Map();
        ownedTasks.forEach(t => taskMap.set(t.id, t));
        participatedTasks.forEach(p => {
            if (!taskMap.has(p.taskId)) {
                taskMap.set(p.taskId, p.task);
            }
        });

        return Array.from(taskMap.values());
    }

    async findOne(taskId: string) {
        return this.db.query.tasks.findFirst({
            where: eq(schema.tasks.id, taskId),
            with: {
                assigner: true,
                owner: true,
                participants: {
                    with: {
                        user: true
                    }
                },
                milestones: true,
                timeLogs: {
                    with: {
                        user: true
                    }
                },
            }
        });
    }

    async getUserStats(userId: string) {
        const ownedTasks = await this.db.query.tasks.findMany({
            where: eq(schema.tasks.responsibleOwner, userId),
        });

        const delegatedTasksCount = await this.db.select().from(schema.tasks)
            .where(eq(schema.tasks.assignedBy, userId));

        const timeLogs = await this.db.query.timeLogs.findMany({
            where: eq(schema.timeLogs.userId, userId),
        });

        const stats = {
            active: ownedTasks.filter(t => t.status === 'ACTIVE').length,
            pending: ownedTasks.filter(t => t.status === 'PENDING').length,
            blocked: ownedTasks.filter(t => t.syncState === 'BLOCKED').length,
            helpRequested: ownedTasks.filter(t => t.syncState === 'HELP_REQUESTED').length,
            delegated: delegatedTasksCount.length,
            totalTimeMins: timeLogs.reduce((sum, log) => sum + parseInt(log.durationMinutes || '0'), 0),
            syncStates: {
                IN_SYNC: ownedTasks.filter(t => t.syncState === 'IN_SYNC').length,
                NEEDS_UPDATE: ownedTasks.filter(t => t.syncState === 'NEEDS_UPDATE').length,
                BLOCKED: ownedTasks.filter(t => t.syncState === 'BLOCKED').length,
                HELP_REQUESTED: ownedTasks.filter(t => t.syncState === 'HELP_REQUESTED').length,
            }
        };

        return stats;
    }

    private async logAction(taskId: string, userId: string, action: string) {
        await this.db.insert(schema.syncLogs).values({
            taskId,
            userId,
            action,
        });
    }
}

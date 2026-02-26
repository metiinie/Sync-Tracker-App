import { Injectable, Inject, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, or } from 'drizzle-orm';
import { SyncGateway } from '../sync/sync.gateway';

@Injectable()
export class TasksService {
    constructor(
        @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
        private syncGateway: SyncGateway,
    ) { }

    async create(title: string, description: string, assignedBy: string, responsibleOwner: string) {
        const [task] = await this.db.insert(schema.tasks).values({
            title,
            description,
            assignedBy,
            responsibleOwner,
            status: 'PENDING',
        }).returning();

        // Log the creation
        await this.logAction(task.id, assignedBy, `Task created and assigned to ${responsibleOwner}`);

        this.syncGateway.emitToTask(task.id, 'task:created', task);

        return task;
    }

    async accept(taskId: string, userId: string) {
        const task = await this.db.query.tasks.findFirst({
            where: eq(schema.tasks.id, taskId),
        });

        if (!task) throw new NotFoundException('Task not found');
        if (task.responsibleOwner !== userId) throw new UnauthorizedException('Only the responsible owner can accept the task');
        if (task.status !== 'PENDING') throw new BadRequestException('Task is not in PENDING state');

        const [updatedTask] = await this.db.update(schema.tasks)
            .set({ status: 'ACTIVE' })
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
                .set({ syncState })
                .where(eq(schema.tasks.id, taskId));
        }

        await this.logAction(taskId, userId, `Sync state updated to ${syncState}`);

        this.syncGateway.emitToTask(taskId, 'sync:update', { taskId, userId, syncState });

        if (syncState === 'HELP_REQUESTED') {
            this.syncGateway.emitToTask(taskId, 'task:help', { userId });
        }

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
                status: 'PENDING'
            })
            .where(eq(schema.tasks.id, taskId))
            .returning();

        await this.logAction(taskId, currentOwnerId, `Transfer initiated to ${newOwnerId}`);
        await this.logAction(taskId, newOwnerId, `Received responsibility (PENDING acceptance)`);

        this.syncGateway.emitToTask(taskId, 'task:transfer', { from: currentOwnerId, to: newOwnerId });

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
                }
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
                        }
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

    private async logAction(taskId: string, userId: string, action: string) {
        await this.db.insert(schema.syncLogs).values({
            taskId,
            userId,
            action,
        });
    }
}

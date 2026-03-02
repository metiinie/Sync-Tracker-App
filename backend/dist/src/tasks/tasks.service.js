"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const db_module_1 = require("../db/db.module");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema = __importStar(require("../db/schema"));
const drizzle_orm_1 = require("drizzle-orm");
const sync_gateway_1 = require("../sync/sync.gateway");
const notifications_service_1 = require("../notifications/notifications.service");
let TasksService = class TasksService {
    db;
    syncGateway;
    notificationsService;
    constructor(db, syncGateway, notificationsService) {
        this.db = db;
        this.syncGateway = syncGateway;
        this.notificationsService = notificationsService;
    }
    async create(title, description, assignedBy, responsibleOwner, participants = [], milestones = [], priority = 'MEDIUM') {
        const taskDetails = await this.db.transaction(async (tx) => {
            const [task] = await tx
                .insert(schema.tasks)
                .values({
                title,
                description,
                assignedBy,
                responsibleOwner,
                status: 'PENDING',
                priority: priority || 'MEDIUM',
            })
                .returning();
            await tx.insert(schema.notifications).values({
                userId: responsibleOwner,
                taskId: task.id,
                type: 'ASSIGNED',
                content: `You have been assigned as the responsible owner for "${title}"`,
                isRead: 'false',
            });
            if (participants && participants.length > 0) {
                await tx.insert(schema.taskParticipants).values(participants.map((p) => ({
                    taskId: task.id,
                    userId: p.userId,
                    role: p.role,
                })));
                await tx.insert(schema.notifications).values(participants.map((p) => ({
                    userId: p.userId,
                    taskId: task.id,
                    type: 'PARTICIPANT_ADDED',
                    content: `You have been added as a ${p.role} to "${title}"`,
                    isRead: 'false',
                })));
            }
            if (milestones && milestones.length > 0) {
                await tx.insert(schema.milestones).values(milestones.map((m) => ({
                    taskId: task.id,
                    title: m,
                })));
            }
            await tx.insert(schema.syncLogs).values({
                taskId: task.id,
                userId: assignedBy,
                action: `Task created and assigned to ${responsibleOwner}`,
                metadata: { type: 'TASK_CREATED', responsibleOwner }
            });
            return task;
        });
        this.syncGateway.emitToTask(taskDetails.id, 'task:created', taskDetails);
        this.syncGateway.server
            .to(`user:${responsibleOwner}`)
            .emit('notification:new', {
            userId: responsibleOwner,
            taskId: taskDetails.id,
            type: 'ASSIGNED',
            content: `You have been assigned as the responsible owner for "${title}"`,
            isRead: 'false',
        });
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
    async addMilestone(taskId, title, userId, dueDate) {
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
    async updateMilestone(milestoneId, data, userId) {
        const updateData = {};
        if (data.title !== undefined)
            updateData.title = data.title;
        if (data.dueDate !== undefined)
            updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        if (data.isCompleted !== undefined)
            updateData.isCompleted = data.isCompleted ? 'true' : 'false';
        const [milestone] = await this.db
            .update(schema.milestones)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(schema.milestones.id, milestoneId))
            .returning();
        await this.logAction(milestone.taskId, userId, `Milestone updated: ${milestone.title}`, { type: 'MILESTONE_UPDATED', milestoneId, milestoneTitle: milestone.title, data });
        this.syncGateway.emitToTask(milestone.taskId, 'milestone:updated', milestone);
        return milestone;
    }
    async deleteMilestone(milestoneId, userId) {
        const [milestone] = await this.db
            .delete(schema.milestones)
            .where((0, drizzle_orm_1.eq)(schema.milestones.id, milestoneId))
            .returning();
        if (milestone) {
            await this.logAction(milestone.taskId, userId, `Milestone deleted: ${milestone.title}`, { type: 'MILESTONE_DELETED', milestoneId, milestoneTitle: milestone.title });
            this.syncGateway.emitToTask(milestone.taskId, 'milestone:deleted', {
                id: milestoneId,
            });
        }
        return { success: true };
    }
    async toggleMilestone(milestoneId, isCompleted, userId) {
        return this.updateMilestone(milestoneId, { isCompleted }, userId);
    }
    async logTime(taskId, userId, durationMinutes, description) {
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
        await this.logAction(taskId, userId, `Logged ${duration} mins: ${description}`, { type: 'TIME_LOGGED', durationMinutes: duration, description });
        this.syncGateway.emitToTask(taskId, 'timelog:created', log);
        return log;
    }
    async accept(taskId, userId) {
        const task = await this.db.query.tasks.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.tasks.id, taskId),
        });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        if (task.responsibleOwner !== userId)
            throw new common_1.UnauthorizedException('Only the responsible owner can accept the task');
        if (task.status !== 'PENDING')
            throw new common_1.BadRequestException('Task is not in PENDING state');
        const [updatedTask] = await this.db
            .update(schema.tasks)
            .set({
            status: 'ACTIVE',
            lastUpdatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema.tasks.id, taskId))
            .returning();
        await this.logAction(taskId, userId, 'Responsibility accepted', { type: 'TASK_ACCEPTED' });
        this.syncGateway.emitToTask(taskId, 'task:accepted', updatedTask);
        return updatedTask;
    }
    async complete(taskId, userId) {
        const task = await this.db.query.tasks.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.tasks.id, taskId),
        });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        if (task.assignedBy !== userId) {
            throw new common_1.UnauthorizedException('Only the assigner can mark the track as complete');
        }
        const [updatedTask] = await this.db
            .update(schema.tasks)
            .set({
            status: 'COMPLETED',
            completedAt: new Date(),
            lastUpdatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema.tasks.id, taskId))
            .returning();
        await this.logAction(taskId, userId, 'Track marked as COMPLETED', { type: 'TASK_COMPLETED' });
        this.syncGateway.emitToTask(taskId, 'task:completed', updatedTask);
        return updatedTask;
    }
    async updateSyncState(taskId, userId, syncState, note) {
        const participant = await this.db.query.taskParticipants.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.taskParticipants.taskId, taskId), (0, drizzle_orm_1.eq)(schema.taskParticipants.userId, userId)),
        });
        const task = await this.db.query.tasks.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.tasks.id, taskId),
        });
        if (!participant && task?.responsibleOwner !== userId) {
            throw new common_1.UnauthorizedException('Not authorized to update sync state for this task');
        }
        if (participant) {
            await this.db
                .update(schema.taskParticipants)
                .set({ syncState })
                .where((0, drizzle_orm_1.eq)(schema.taskParticipants.id, participant.id));
        }
        if (task?.responsibleOwner === userId) {
            await this.db
                .update(schema.tasks)
                .set({
                syncState,
                lastUpdatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema.tasks.id, taskId));
            if (syncState === 'HELP_REQUESTED') {
                const fullTask = await this.findOne(taskId);
                if (fullTask) {
                    const log = await this.logAction(taskId, userId, `Sync state updated to ${syncState}${note ? `: ${note}` : ''}`, {
                        oldState: task?.syncState,
                        newState: syncState,
                        note: note || null
                    });
                    await this.notificationsService.create(fullTask.assignedBy, taskId, 'HELP_REQUESTED', `Help requested on "${fullTask.title}" by ${fullTask.owner?.name}`, log.id);
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
    async transfer(taskId, currentOwnerId, newOwnerId) {
        const task = await this.db.query.tasks.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.tasks.id, taskId),
        });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        if (task.responsibleOwner !== currentOwnerId)
            throw new common_1.UnauthorizedException('Only the current responsible owner can transfer responsibility');
        const [updatedTask] = await this.db
            .update(schema.tasks)
            .set({
            responsibleOwner: newOwnerId,
            status: 'PENDING',
            lastUpdatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema.tasks.id, taskId))
            .returning();
        await this.logAction(taskId, currentOwnerId, `Transfer initiated to ${newOwnerId}`, { type: 'TRANSFER_INITIATED', toUserId: newOwnerId });
        await this.logAction(taskId, newOwnerId, `Received responsibility (PENDING acceptance)`, { type: 'TRANSFER_RECEIVED', fromUserId: currentOwnerId });
        this.syncGateway.emitToTask(taskId, 'task:transfer', {
            from: currentOwnerId,
            to: newOwnerId,
        });
        await this.notificationsService.create(newOwnerId, taskId, 'TRANSFER_INITIATED', `Responsibility for "${task.title}" has been transferred to you.`);
        return updatedTask;
    }
    async nudge(taskId, userId) {
        const task = await this.db.query.tasks.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.tasks.id, taskId),
            with: {
                owner: true,
            },
        });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        if (task.assignedBy !== userId) {
            throw new common_1.UnauthorizedException('Only the assigner can nudge the responsible owner');
        }
        const log = await this.logAction(taskId, userId, `Nudged responsible owner (${task.owner?.name})`, { type: 'NUDGE' });
        await this.notificationsService.create(task.responsibleOwner, taskId, 'NUDGE', `You've been nudged on "${task.title}" by the assigner.`, log.id);
        this.syncGateway.emitToTask(taskId, 'task:nudge', {
            taskId,
            nudgedBy: userId,
            nudgedUser: task.responsibleOwner,
            activityId: log.id
        });
        return { success: true };
    }
    async addParticipant(taskId, userId, role, addedBy) {
        const [participant] = await this.db
            .insert(schema.taskParticipants)
            .values({
            taskId,
            userId,
            role: role,
        })
            .returning();
        await this.logAction(taskId, addedBy, `User ${userId} added as ${role}`, {
            type: 'PARTICIPANT_ADDED',
            addedUserId: userId,
            role
        });
        this.syncGateway.emitToTask(taskId, 'task:join', { userId, role });
        const task = await this.db.query.tasks.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.tasks.id, taskId),
        });
        if (task) {
            await this.notificationsService.create(userId, taskId, 'PARTICIPANT_ADDED', `You have been added as a ${role} to "${task.title}"`);
        }
        return participant;
    }
    async removeParticipant(taskId, userId, removedBy) {
        const [participant] = await this.db
            .delete(schema.taskParticipants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.taskParticipants.taskId, taskId), (0, drizzle_orm_1.eq)(schema.taskParticipants.userId, userId)))
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
    async findAllForUser(userId) {
        const ownedTasks = await this.db.query.tasks.findMany({
            where: (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema.tasks.responsibleOwner, userId), (0, drizzle_orm_1.eq)(schema.tasks.assignedBy, userId)),
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
            where: (0, drizzle_orm_1.eq)(schema.taskParticipants.userId, userId),
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
        const taskMap = new Map();
        ownedTasks.forEach((t) => taskMap.set(t.id, t));
        participatedTasks.forEach((p) => {
            if (!taskMap.has(p.taskId)) {
                taskMap.set(p.taskId, p.task);
            }
        });
        return Array.from(taskMap.values());
    }
    async update(taskId, userId, data) {
        const task = await this.db.query.tasks.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.tasks.id, taskId),
        });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        if (task.assignedBy !== userId && task.responsibleOwner !== userId) {
            throw new common_1.UnauthorizedException('Not authorized to update this task');
        }
        const [updatedTask] = await this.db
            .update(schema.tasks)
            .set({
            ...data,
            lastUpdatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema.tasks.id, taskId))
            .returning();
        await this.logAction(taskId, userId, `Task updated: ${Object.keys(data).join(', ')}`, {
            type: 'TASK_UPDATED',
            updates: data
        });
        this.syncGateway.emitToTask(taskId, 'task:updated', updatedTask);
        return updatedTask;
    }
    async delete(taskId, userId) {
        const task = await this.db.query.tasks.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.tasks.id, taskId),
        });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        if (task.assignedBy !== userId) {
            throw new common_1.UnauthorizedException('Only the assigner can delete the task');
        }
        await this.db.transaction(async (tx) => {
            await tx.delete(schema.milestones).where((0, drizzle_orm_1.eq)(schema.milestones.taskId, taskId));
            await tx.delete(schema.taskParticipants).where((0, drizzle_orm_1.eq)(schema.taskParticipants.taskId, taskId));
            await tx.delete(schema.timeLogs).where((0, drizzle_orm_1.eq)(schema.timeLogs.taskId, taskId));
            await tx.delete(schema.syncLogs).where((0, drizzle_orm_1.eq)(schema.syncLogs.taskId, taskId));
            await tx.delete(schema.notifications).where((0, drizzle_orm_1.eq)(schema.notifications.taskId, taskId));
            await tx.delete(schema.taskComments).where((0, drizzle_orm_1.eq)(schema.taskComments.taskId, taskId));
            await tx.delete(schema.tasks).where((0, drizzle_orm_1.eq)(schema.tasks.id, taskId));
        });
        this.syncGateway.emitToTask(taskId, 'task:deleted', { id: taskId });
        return { success: true };
    }
    async addComment(taskId, userId, content) {
        const [comment] = await this.db
            .insert(schema.taskComments)
            .values({
            taskId,
            userId,
            content,
        })
            .returning();
        const fullComment = await this.db.query.taskComments.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.taskComments.id, comment.id),
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
    async getComments(taskId) {
        return this.db.query.taskComments.findMany({
            where: (0, drizzle_orm_1.eq)(schema.taskComments.taskId, taskId),
            with: {
                user: true,
            },
            orderBy: (comments, { asc }) => [asc(comments.createdAt)],
        });
    }
    async findOne(taskId) {
        return this.db.query.tasks.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.tasks.id, taskId),
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
    async getUserStats(userId) {
        const ownedTasks = await this.db.query.tasks.findMany({
            where: (0, drizzle_orm_1.eq)(schema.tasks.responsibleOwner, userId),
        });
        const delegatedTasksCount = await this.db
            .select()
            .from(schema.tasks)
            .where((0, drizzle_orm_1.eq)(schema.tasks.assignedBy, userId));
        const timeLogs = await this.db.query.timeLogs.findMany({
            where: (0, drizzle_orm_1.eq)(schema.timeLogs.userId, userId),
        });
        const stats = {
            active: ownedTasks.filter((t) => t.status === 'ACTIVE').length,
            pending: ownedTasks.filter((t) => t.status === 'PENDING').length,
            blocked: ownedTasks.filter((t) => t.syncState === 'BLOCKED').length,
            helpRequested: ownedTasks.filter((t) => t.syncState === 'HELP_REQUESTED')
                .length,
            delegated: delegatedTasksCount.length,
            totalTimeMins: timeLogs.reduce((sum, log) => sum + parseInt(log.durationMinutes || '0'), 0),
            syncStates: {
                IN_SYNC: ownedTasks.filter((t) => t.syncState === 'IN_SYNC').length,
                NEEDS_UPDATE: ownedTasks.filter((t) => t.syncState === 'NEEDS_UPDATE')
                    .length,
                BLOCKED: ownedTasks.filter((t) => t.syncState === 'BLOCKED').length,
                HELP_REQUESTED: ownedTasks.filter((t) => t.syncState === 'HELP_REQUESTED').length,
            },
        };
        return stats;
    }
    async syncParticipant(taskId, userId) {
        const participant = await this.db.query.taskParticipants.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.taskParticipants.taskId, taskId), (0, drizzle_orm_1.eq)(schema.taskParticipants.userId, userId)),
        });
        if (!participant)
            throw new common_1.NotFoundException('Participant record not found');
        await this.db
            .update(schema.taskParticipants)
            .set({
            syncState: 'IN_SYNC',
            lastUpdatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema.taskParticipants.id, participant.id));
        await this.logAction(taskId, userId, `Quick Sync: Participant (${participant.role}) state updated to IN_SYNC`, { type: 'SYNC_QUICK', role: participant.role });
        this.syncGateway.emitToTask(taskId, 'sync:update', {
            taskId,
            userId,
            syncState: 'IN_SYNC',
        });
        return { success: true };
    }
    async syncAll(userId) {
        const ownedTasks = await this.db.query.tasks.findMany({
            where: (0, drizzle_orm_1.eq)(schema.tasks.responsibleOwner, userId),
        });
        const ownedSyncs = ownedTasks.map(async (task) => {
            if (task.syncState === 'IN_SYNC')
                return;
            await this.db
                .update(schema.tasks)
                .set({
                syncState: 'IN_SYNC',
                lastUpdatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema.tasks.id, task.id));
            await this.logAction(task.id, userId, 'Global Sync: Owner state updated to IN_SYNC');
            this.syncGateway.emitToTask(task.id, 'sync:update', {
                taskId: task.id,
                userId,
                syncState: 'IN_SYNC',
            });
        });
        const participations = await this.db.query.taskParticipants.findMany({
            where: (0, drizzle_orm_1.eq)(schema.taskParticipants.userId, userId),
        });
        const participantSyncs = participations.map(async (p) => {
            if (p.syncState === 'IN_SYNC')
                return;
            await this.db
                .update(schema.taskParticipants)
                .set({
                syncState: 'IN_SYNC',
                lastUpdatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema.taskParticipants.id, p.id));
            await this.logAction(p.taskId, userId, `Global Sync: Participant (${p.role}) state updated to IN_SYNC`);
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
    async logAction(taskId, userId, action, metadata) {
        const [log] = await this.db.insert(schema.syncLogs).values({
            taskId,
            userId,
            action,
            metadata,
        }).returning();
        return log;
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(db_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        sync_gateway_1.SyncGateway,
        notifications_service_1.NotificationsService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map
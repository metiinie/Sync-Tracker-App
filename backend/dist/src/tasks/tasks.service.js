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
    async create(title, description, assignedBy, responsibleOwner, participants = [], milestones = []) {
        return await this.db.transaction(async (tx) => {
            const [task] = await tx.insert(schema.tasks).values({
                title,
                description,
                assignedBy,
                responsibleOwner,
                status: 'PENDING',
            }).returning();
            await this.notificationsService.create(responsibleOwner, task.id, 'ASSIGNED', `You have been assigned as the responsible owner for "${title}"`);
            if (participants && participants.length > 0) {
                await tx.insert(schema.taskParticipants).values(participants.map(p => ({
                    taskId: task.id,
                    userId: p.userId,
                    role: p.role,
                })));
                for (const p of participants) {
                    await this.notificationsService.create(p.userId, task.id, 'PARTICIPANT_ADDED', `You have been added as a ${p.role} to "${title}"`);
                }
            }
            if (milestones && milestones.length > 0) {
                await tx.insert(schema.milestones).values(milestones.map(m => ({
                    taskId: task.id,
                    title: m,
                })));
            }
            await tx.insert(schema.syncLogs).values({
                taskId: task.id,
                userId: assignedBy,
                action: `Task created and assigned to ${responsibleOwner}`,
            });
            this.syncGateway.emitToTask(task.id, 'task:created', task);
            return task;
        });
    }
    async addMilestone(taskId, title, userId) {
        const [milestone] = await this.db.insert(schema.milestones).values({
            taskId,
            title,
        }).returning();
        await this.logAction(taskId, userId, `Milestone added: ${title}`);
        this.syncGateway.emitToTask(taskId, 'milestone:created', milestone);
        return milestone;
    }
    async toggleMilestone(milestoneId, isCompleted, userId) {
        const [milestone] = await this.db.update(schema.milestones)
            .set({ isCompleted: isCompleted ? 'true' : 'false' })
            .where((0, drizzle_orm_1.eq)(schema.milestones.id, milestoneId))
            .returning();
        await this.logAction(milestone.taskId, userId, `Milestone ${milestone.title} marked as ${isCompleted ? 'completed' : 'incomplete'}`);
        this.syncGateway.emitToTask(milestone.taskId, 'milestone:updated', milestone);
        return milestone;
    }
    async logTime(taskId, userId, durationMinutes, description) {
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
        const [updatedTask] = await this.db.update(schema.tasks)
            .set({ status: 'ACTIVE' })
            .where((0, drizzle_orm_1.eq)(schema.tasks.id, taskId))
            .returning();
        await this.logAction(taskId, userId, 'Responsibility accepted');
        this.syncGateway.emitToTask(taskId, 'task:accepted', updatedTask);
        return updatedTask;
    }
    async updateSyncState(taskId, userId, syncState) {
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
            await this.db.update(schema.taskParticipants)
                .set({ syncState })
                .where((0, drizzle_orm_1.eq)(schema.taskParticipants.id, participant.id));
        }
        if (task?.responsibleOwner === userId) {
            await this.db.update(schema.tasks)
                .set({ syncState })
                .where((0, drizzle_orm_1.eq)(schema.tasks.id, taskId));
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
    async transfer(taskId, currentOwnerId, newOwnerId) {
        const task = await this.db.query.tasks.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.tasks.id, taskId),
        });
        if (!task)
            throw new common_1.NotFoundException('Task not found');
        if (task.responsibleOwner !== currentOwnerId)
            throw new common_1.UnauthorizedException('Only the current responsible owner can transfer responsibility');
        const [updatedTask] = await this.db.update(schema.tasks)
            .set({
            responsibleOwner: newOwnerId,
            status: 'PENDING'
        })
            .where((0, drizzle_orm_1.eq)(schema.tasks.id, taskId))
            .returning();
        await this.logAction(taskId, currentOwnerId, `Transfer initiated to ${newOwnerId}`);
        await this.logAction(taskId, newOwnerId, `Received responsibility (PENDING acceptance)`);
        this.syncGateway.emitToTask(taskId, 'task:transfer', { from: currentOwnerId, to: newOwnerId });
        await this.notificationsService.create(newOwnerId, taskId, 'TRANSFER_INITIATED', `Responsibility for "${task.title}" has been transferred to you.`);
        return updatedTask;
    }
    async addParticipant(taskId, userId, role, addedBy) {
        const [participant] = await this.db.insert(schema.taskParticipants).values({
            taskId,
            userId,
            role: role,
        }).returning();
        await this.logAction(taskId, addedBy, `User ${userId} added as ${role}`);
        this.syncGateway.emitToTask(taskId, 'task:join', { userId, role });
        const task = await this.db.query.tasks.findFirst({ where: (0, drizzle_orm_1.eq)(schema.tasks.id, taskId) });
        if (task) {
            await this.notificationsService.create(userId, taskId, 'PARTICIPANT_ADDED', `You have been added as a ${role} to "${task.title}"`);
        }
        return participant;
    }
    async findAllForUser(userId) {
        const ownedTasks = await this.db.query.tasks.findMany({
            where: (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema.tasks.responsibleOwner, userId), (0, drizzle_orm_1.eq)(schema.tasks.assignedBy, userId)),
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
                logs: true,
            }
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
                                user: true
                            }
                        },
                        milestones: true,
                        timeLogs: {
                            with: {
                                user: true
                            }
                        },
                        logs: true,
                    }
                }
            }
        });
        const taskMap = new Map();
        ownedTasks.forEach(t => taskMap.set(t.id, t));
        participatedTasks.forEach(p => {
            if (!taskMap.has(p.taskId)) {
                taskMap.set(p.taskId, p.task);
            }
        });
        return Array.from(taskMap.values());
    }
    async findOne(taskId) {
        return this.db.query.tasks.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.tasks.id, taskId),
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
                logs: {
                    with: {
                        user: true
                    }
                },
            }
        });
    }
    async getUserStats(userId) {
        const ownedTasks = await this.db.query.tasks.findMany({
            where: (0, drizzle_orm_1.eq)(schema.tasks.responsibleOwner, userId),
        });
        const delegatedTasksCount = await this.db.select().from(schema.tasks)
            .where((0, drizzle_orm_1.eq)(schema.tasks.assignedBy, userId));
        const timeLogs = await this.db.query.timeLogs.findMany({
            where: (0, drizzle_orm_1.eq)(schema.timeLogs.userId, userId),
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
    async logAction(taskId, userId, action) {
        await this.db.insert(schema.syncLogs).values({
            taskId,
            userId,
            action,
        });
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
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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const db_module_1 = require("../db/db.module");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema = __importStar(require("../db/schema"));
const drizzle_orm_1 = require("drizzle-orm");
const sync_gateway_1 = require("../sync/sync.gateway");
let AdminService = class AdminService {
    db;
    syncGateway;
    constructor(db, syncGateway) {
        this.db = db;
        this.syncGateway = syncGateway;
    }
    async getGlobalMetrics() {
        const now = new Date();
        const staleThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const [activeTasks] = await this.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.tasks).where((0, drizzle_orm_1.eq)(schema.tasks.status, 'ACTIVE'));
        const [blockedTasks] = await this.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.tasks).where((0, drizzle_orm_1.eq)(schema.tasks.syncState, 'BLOCKED'));
        const [helpRequests] = await this.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.tasks).where((0, drizzle_orm_1.eq)(schema.tasks.syncState, 'HELP_REQUESTED'));
        const [pendingAcceptance] = await this.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.tasks).where((0, drizzle_orm_1.eq)(schema.tasks.status, 'PENDING'));
        const [staleTasks] = await this.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.tasks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.tasks.status, 'ACTIVE'), (0, drizzle_orm_1.lt)(schema.tasks.lastUpdatedAt, staleThreshold)));
        return {
            totalActiveTasks: Number(activeTasks.count),
            blockedTasks: Number(blockedTasks.count),
            helpRequests: Number(helpRequests.count),
            pendingAcceptance: Number(pendingAcceptance.count),
            staleSyncTasks: Number(staleTasks.count),
        };
    }
    async findAllTasks(filters) {
        const whereClauses = [];
        if (filters.ownerId) {
            whereClauses.push((0, drizzle_orm_1.eq)(schema.tasks.responsibleOwner, filters.ownerId));
        }
        if (filters.status) {
            whereClauses.push((0, drizzle_orm_1.eq)(schema.tasks.status, filters.status));
        }
        if (filters.syncState) {
            whereClauses.push((0, drizzle_orm_1.eq)(schema.tasks.syncState, filters.syncState));
        }
        if (filters.search) {
            whereClauses.push((0, drizzle_orm_1.ilike)(schema.tasks.title, `%${filters.search}%`));
        }
        return await this.db.query.tasks.findMany({
            where: whereClauses.length > 0 ? (0, drizzle_orm_1.and)(...whereClauses) : undefined,
            with: {
                owner: true,
                assigner: true,
                participants: { with: { user: true } },
            },
            orderBy: [(0, drizzle_orm_1.desc)(schema.tasks.createdAt)],
        });
    }
    async forceCloseTask(taskId, reason, adminId) {
        return await this.db.transaction(async (tx) => {
            const [task] = await tx.update(schema.tasks)
                .set({ status: 'CANCELLED', lastUpdatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema.tasks.id, taskId))
                .returning();
            await tx.insert(schema.syncLogs).values({
                taskId,
                userId: adminId,
                action: `ADMIN FORCE CLOSE: ${reason}`,
            });
            this.syncGateway.emitToTask(taskId, 'task:updated', task);
            return task;
        });
    }
    async freezeTask(taskId, reason, adminId) {
        return await this.db.transaction(async (tx) => {
            const [task] = await tx.update(schema.tasks)
                .set({ status: 'FROZEN', lastUpdatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema.tasks.id, taskId))
                .returning();
            await tx.insert(schema.syncLogs).values({
                taskId,
                userId: adminId,
                action: `ADMIN FREEZE: ${reason}`,
            });
            this.syncGateway.emitToTask(taskId, 'task:updated', task);
            return task;
        });
    }
    async reopenTask(taskId, reason, adminId) {
        return await this.db.transaction(async (tx) => {
            const [task] = await tx.update(schema.tasks)
                .set({ status: 'ACTIVE', lastUpdatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema.tasks.id, taskId))
                .returning();
            await tx.insert(schema.syncLogs).values({
                taskId,
                userId: adminId,
                action: `ADMIN REOPEN: ${reason}`,
            });
            this.syncGateway.emitToTask(taskId, 'task:updated', task);
            return task;
        });
    }
    async removeParticipant(taskId, userId, reason, adminId) {
        return await this.db.transaction(async (tx) => {
            await tx.delete(schema.taskParticipants)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.taskParticipants.taskId, taskId), (0, drizzle_orm_1.eq)(schema.taskParticipants.userId, userId)));
            await tx.insert(schema.syncLogs).values({
                taskId,
                userId: adminId,
                action: `ADMIN REMOVED PARTICIPANT (${userId}): ${reason}`,
            });
            this.syncGateway.emitToTask(taskId, 'task:participant-removed', { userId });
            return { success: true };
        });
    }
    async findAllUsers() {
        const users = await this.db.query.users.findMany({
            orderBy: [(0, drizzle_orm_1.desc)(schema.users.createdAt)],
        });
        const usersWithMetrics = await Promise.all(users.map(async (user) => {
            const [activeTasks] = await this.db.select({ count: (0, drizzle_orm_1.count)() })
                .from(schema.tasks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.tasks.responsibleOwner, user.id), (0, drizzle_orm_1.eq)(schema.tasks.status, 'ACTIVE')));
            const [blockedTasks] = await this.db.select({ count: (0, drizzle_orm_1.count)() })
                .from(schema.tasks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.tasks.responsibleOwner, user.id), (0, drizzle_orm_1.eq)(schema.tasks.syncState, 'BLOCKED')));
            const [lastActivity] = await this.db.select()
                .from(schema.syncLogs)
                .where((0, drizzle_orm_1.eq)(schema.syncLogs.userId, user.id))
                .orderBy((0, drizzle_orm_1.desc)(schema.syncLogs.timestamp))
                .limit(1);
            return {
                ...user,
                metrics: {
                    activeTasks: Number(activeTasks.count),
                    blockedTasks: Number(blockedTasks.count),
                    lastActivity: lastActivity?.timestamp || user.createdAt,
                }
            };
        }));
        return usersWithMetrics;
    }
    async getUserDetails(userId) {
        const user = await this.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema.users.id, userId),
        });
        if (!user)
            return null;
        const tasksAsOwner = await this.db.query.tasks.findMany({
            where: (0, drizzle_orm_1.eq)(schema.tasks.responsibleOwner, userId),
        });
        const tasksParticipating = await this.db.query.taskParticipants.findMany({
            where: (0, drizzle_orm_1.eq)(schema.taskParticipants.userId, userId),
            with: { task: true },
        });
        const [timeLogged] = await this.db.select({ total: (0, drizzle_orm_1.sql) `sum(duration_minutes)` })
            .from(schema.timeLogs)
            .where((0, drizzle_orm_1.eq)(schema.timeLogs.userId, userId));
        const syncStats = {
            IN_SYNC: tasksAsOwner.filter(t => t.syncState === 'IN_SYNC').length,
            NEEDS_UPDATE: tasksAsOwner.filter(t => t.syncState === 'NEEDS_UPDATE').length,
            BLOCKED: tasksAsOwner.filter(t => t.syncState === 'BLOCKED').length,
            HELP_REQUESTED: tasksAsOwner.filter(t => t.syncState === 'HELP_REQUESTED').length,
        };
        return {
            ...user,
            tasksAsOwner,
            tasksParticipating,
            totalTimeLogged: Number(timeLogged?.total || 0),
            syncStats,
        };
    }
    async updateUserRole(userId, role, reason, adminId) {
        return await this.db.transaction(async (tx) => {
            const [user] = await tx.update(schema.users)
                .set({ systemRole: role })
                .where((0, drizzle_orm_1.eq)(schema.users.id, userId))
                .returning();
            await tx.insert(schema.syncLogs).values({
                userId: adminId,
                taskId: null,
                action: `ADMIN CHANGE USER ROLE (${user.name} to ${role}): ${reason}`,
            });
            return user;
        });
    }
    async suspendUser(userId, reason, adminId) {
        return await this.db.transaction(async (tx) => {
            const [user] = await tx.update(schema.users)
                .set({ isSuspended: true })
                .where((0, drizzle_orm_1.eq)(schema.users.id, userId))
                .returning();
            await tx.insert(schema.syncLogs).values({
                userId: adminId,
                taskId: null,
                action: `ADMIN SUSPEND USER (${user.name}): ${reason}`,
            });
            return user;
        });
    }
    async reactivateUser(userId, reason, adminId) {
        return await this.db.transaction(async (tx) => {
            const [user] = await tx.update(schema.users)
                .set({ isSuspended: false })
                .where((0, drizzle_orm_1.eq)(schema.users.id, userId))
                .returning();
            await tx.insert(schema.syncLogs).values({
                userId: adminId,
                taskId: null,
                action: `ADMIN REACTIVATE USER (${user.name}): ${reason}`,
            });
            return user;
        });
    }
    async getHighRiskTasks() {
        const now = new Date();
        const staleThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return await this.db.query.tasks.findMany({
            where: (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema.tasks.syncState, 'BLOCKED'), (0, drizzle_orm_1.eq)(schema.tasks.syncState, 'HELP_REQUESTED'), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema.tasks.status, 'ACTIVE'), (0, drizzle_orm_1.lt)(schema.tasks.lastUpdatedAt, staleThreshold))),
            with: {
                owner: true,
                assigner: true,
            },
            orderBy: [(0, drizzle_orm_1.desc)(schema.tasks.lastUpdatedAt)],
            limit: 20,
        });
    }
    async getTransferAlerts() {
        return await this.db.query.tasks.findMany({
            where: (0, drizzle_orm_1.eq)(schema.tasks.status, 'PENDING'),
            with: {
                owner: true,
                assigner: true,
            },
            orderBy: [(0, drizzle_orm_1.desc)(schema.tasks.createdAt)],
            limit: 10,
        });
    }
    async getActivityPulse() {
        return await this.db.query.syncLogs.findMany({
            where: (0, drizzle_orm_1.or)((0, drizzle_orm_1.sql) `${schema.syncLogs.action} ILIKE '%help%'`, (0, drizzle_orm_1.sql) `${schema.syncLogs.action} ILIKE '%transfer%'`, (0, drizzle_orm_1.sql) `${schema.syncLogs.action} ILIKE '%blocked%'`),
            with: {
                user: true,
                task: true,
            },
            orderBy: [(0, drizzle_orm_1.desc)(schema.syncLogs.timestamp)],
            limit: 30,
        });
    }
    async getSettings() {
        let settings = await this.db.query.workspaceSettings.findFirst();
        if (!settings) {
            const [newSettings] = await this.db.insert(schema.workspaceSettings).values({}).returning();
            return newSettings;
        }
        return settings;
    }
    async updateSettings(data) {
        return await this.db.update(schema.workspaceSettings)
            .set({ ...data, updatedAt: new Date() })
            .returning();
    }
    async getGlobalAuditLogs(filters) {
        const conditions = [];
        if (filters.userId)
            conditions.push((0, drizzle_orm_1.eq)(schema.syncLogs.userId, filters.userId));
        if (filters.taskId)
            conditions.push((0, drizzle_orm_1.eq)(schema.syncLogs.taskId, filters.taskId));
        if (filters.action)
            conditions.push((0, drizzle_orm_1.ilike)(schema.syncLogs.action, `%${filters.action}%`));
        return await this.db.query.syncLogs.findMany({
            where: drizzle_orm_1.and(...conditions),
            with: {
                user: { columns: { name: true, email: true } },
                task: { columns: { title: true } },
            },
            orderBy: [(0, drizzle_orm_1.desc)(schema.syncLogs.timestamp)],
            limit: filters.limit || 100,
        });
    }
    async getSystemSnapshot() {
        const [userCount] = await this.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.users);
        const [taskCount] = await this.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema.tasks);
        const [activeTasks] = await this.db.select({ count: (0, drizzle_orm_1.count)() })
            .from(schema.tasks)
            .where((0, drizzle_orm_1.eq)(schema.tasks.status, 'ACTIVE'));
        return {
            totalUsers: Number(userCount.count),
            totalTasks: Number(taskCount.count),
            activeTasks: Number(activeTasks.count),
            health: 'OPTIMAL',
            timestamp: new Date(),
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(db_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        sync_gateway_1.SyncGateway])
], AdminService);
//# sourceMappingURL=admin.service.js.map
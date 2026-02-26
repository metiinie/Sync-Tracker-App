import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, count, gte, lt, sql, desc, or, ilike } from 'drizzle-orm';
import { SyncGateway } from '../sync/sync.gateway';

@Injectable()
export class AdminService {
    constructor(
        @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
        private syncGateway: SyncGateway,
    ) { }

    async getGlobalMetrics() {
        const now = new Date();
        const staleThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [activeTasks] = await this.db.select({ count: count() }).from(schema.tasks).where(eq(schema.tasks.status, 'ACTIVE'));
        const [blockedTasks] = await this.db.select({ count: count() }).from(schema.tasks).where(eq(schema.tasks.syncState, 'BLOCKED'));
        const [helpRequests] = await this.db.select({ count: count() }).from(schema.tasks).where(eq(schema.tasks.syncState, 'HELP_REQUESTED'));
        const [pendingAcceptance] = await this.db.select({ count: count() }).from(schema.tasks).where(eq(schema.tasks.status, 'PENDING'));
        const [staleTasks] = await this.db.select({ count: count() }).from(schema.tasks)
            .where(and(
                eq(schema.tasks.status, 'ACTIVE'),
                lt(schema.tasks.lastUpdatedAt, staleThreshold)
            ));

        return {
            totalActiveTasks: Number(activeTasks.count),
            blockedTasks: Number(blockedTasks.count),
            helpRequests: Number(helpRequests.count),
            pendingAcceptance: Number(pendingAcceptance.count),
            staleSyncTasks: Number(staleTasks.count),
        };
    }

    async findAllTasks(filters: { ownerId?: string, status?: any, syncState?: any, search?: string }) {
        const whereClauses: any[] = [];

        if (filters.ownerId) {
            whereClauses.push(eq(schema.tasks.responsibleOwner, filters.ownerId));
        }
        if (filters.status) {
            whereClauses.push(eq(schema.tasks.status, filters.status));
        }
        if (filters.syncState) {
            whereClauses.push(eq(schema.tasks.syncState, filters.syncState));
        }
        if (filters.search) {
            whereClauses.push(ilike(schema.tasks.title, `%${filters.search}%`));
        }

        return await this.db.query.tasks.findMany({
            where: whereClauses.length > 0 ? and(...whereClauses) : undefined,
            with: {
                owner: true,
                assigner: true,
                participants: { with: { user: true } },
            },
            orderBy: [desc(schema.tasks.createdAt)],
        });
    }

    async forceCloseTask(taskId: string, reason: string, adminId: string) {
        return await this.db.transaction(async (tx) => {
            const [task] = await tx.update(schema.tasks)
                .set({ status: 'CANCELLED', lastUpdatedAt: new Date() })
                .where(eq(schema.tasks.id, taskId))
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

    async freezeTask(taskId: string, reason: string, adminId: string) {
        return await this.db.transaction(async (tx) => {
            const [task] = await tx.update(schema.tasks)
                .set({ status: 'FROZEN', lastUpdatedAt: new Date() })
                .where(eq(schema.tasks.id, taskId))
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

    async reopenTask(taskId: string, reason: string, adminId: string) {
        return await this.db.transaction(async (tx) => {
            const [task] = await tx.update(schema.tasks)
                .set({ status: 'ACTIVE', lastUpdatedAt: new Date() })
                .where(eq(schema.tasks.id, taskId))
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

    async removeParticipant(taskId: string, userId: string, reason: string, adminId: string) {
        return await this.db.transaction(async (tx) => {
            await tx.delete(schema.taskParticipants)
                .where(and(
                    eq(schema.taskParticipants.taskId, taskId),
                    eq(schema.taskParticipants.userId, userId)
                ));

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
            orderBy: [desc(schema.users.createdAt)],
        });

        const usersWithMetrics = await Promise.all(users.map(async (user) => {
            const [activeTasks] = await this.db.select({ count: count() })
                .from(schema.tasks)
                .where(and(
                    eq(schema.tasks.responsibleOwner, user.id),
                    eq(schema.tasks.status, 'ACTIVE')
                ));

            const [blockedTasks] = await this.db.select({ count: count() })
                .from(schema.tasks)
                .where(and(
                    eq(schema.tasks.responsibleOwner, user.id),
                    eq(schema.tasks.syncState, 'BLOCKED')
                ));

            const [lastActivity] = await this.db.select()
                .from(schema.syncLogs)
                .where(eq(schema.syncLogs.userId, user.id))
                .orderBy(desc(schema.syncLogs.timestamp))
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

    async getUserDetails(userId: string) {
        const user = await this.db.query.users.findFirst({
            where: eq(schema.users.id, userId),
        });

        if (!user) return null;

        const tasksAsOwner = await this.db.query.tasks.findMany({
            where: eq(schema.tasks.responsibleOwner, userId),
        });

        const tasksParticipating = await this.db.query.taskParticipants.findMany({
            where: eq(schema.taskParticipants.userId, userId),
            with: { task: true },
        });

        const [timeLogged] = await this.db.select({ total: sql<number>`sum(duration_minutes)` })
            .from(schema.timeLogs)
            .where(eq(schema.timeLogs.userId, userId));

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

    async updateUserRole(userId: string, role: 'ADMIN' | 'USER', reason: string, adminId: string) {
        return await this.db.transaction(async (tx) => {
            const [user] = await tx.update(schema.users)
                .set({ systemRole: role })
                .where(eq(schema.users.id, userId))
                .returning();

            await tx.insert(schema.syncLogs).values({
                userId: adminId,
                taskId: null as any,
                action: `ADMIN CHANGE USER ROLE (${user.name} to ${role}): ${reason}`,
            });

            return user;
        });
    }

    async suspendUser(userId: string, reason: string, adminId: string) {
        return await this.db.transaction(async (tx) => {
            const [user] = await tx.update(schema.users)
                .set({ isSuspended: true })
                .where(eq(schema.users.id, userId))
                .returning();

            await tx.insert(schema.syncLogs).values({
                userId: adminId,
                taskId: null as any,
                action: `ADMIN SUSPEND USER (${user.name}): ${reason}`,
            });

            return user;
        });
    }

    async reactivateUser(userId: string, reason: string, adminId: string) {
        return await this.db.transaction(async (tx) => {
            const [user] = await tx.update(schema.users)
                .set({ isSuspended: false })
                .where(eq(schema.users.id, userId))
                .returning();

            await tx.insert(schema.syncLogs).values({
                userId: adminId,
                taskId: null as any,
                action: `ADMIN REACTIVATE USER (${user.name}): ${reason}`,
            });

            return user;
        });
    }

    async getHighRiskTasks() {
        const now = new Date();
        const staleThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        return await this.db.query.tasks.findMany({
            where: or(
                eq(schema.tasks.syncState, 'BLOCKED'),
                eq(schema.tasks.syncState, 'HELP_REQUESTED'),
                and(
                    eq(schema.tasks.status, 'ACTIVE'),
                    lt(schema.tasks.lastUpdatedAt, staleThreshold)
                )
            ),
            with: {
                owner: true,
                assigner: true,
            },
            orderBy: [desc(schema.tasks.lastUpdatedAt)],
            limit: 20,
        });
    }

    async getTransferAlerts() {
        // Pending transfers are tasks with PENDING status that have a transfer log or were assigned by someone else.
        // For simplicity, we'll look for tasks that are PENDING.
        // The implementation_plan suggests: "Pending responsibility transfers"
        return await this.db.query.tasks.findMany({
            where: eq(schema.tasks.status, 'PENDING'),
            with: {
                owner: true,
                assigner: true,
            },
            orderBy: [desc(schema.tasks.createdAt)],
            limit: 10,
        });
    }

    async getActivityPulse() {
        // Live feed of: Help requests, Transfers, Blocked events
        // We'll search sync_logs for specific keywords.
        return await this.db.query.syncLogs.findMany({
            where: or(
                sql`${schema.syncLogs.action} ILIKE '%help%'`,
                sql`${schema.syncLogs.action} ILIKE '%transfer%'`,
                sql`${schema.syncLogs.action} ILIKE '%blocked%'`
            ),
            with: {
                user: true,
                task: true,
            },
            orderBy: [desc(schema.syncLogs.timestamp)],
            limit: 30,
        });
    }
}

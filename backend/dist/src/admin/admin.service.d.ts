import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { SyncGateway } from '../sync/sync.gateway';
export declare class AdminService {
    private db;
    private syncGateway;
    constructor(db: NodePgDatabase<typeof schema>, syncGateway: SyncGateway);
    getGlobalMetrics(): Promise<{
        totalActiveTasks: number;
        blockedTasks: number;
        helpRequests: number;
        pendingAcceptance: number;
        staleSyncTasks: number;
    }>;
    findAllTasks(filters: {
        ownerId?: string;
        status?: any;
        syncState?: any;
        search?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        title: string;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        assigner: {
            id: string;
            name: string;
            email: string;
            systemRole: "ADMIN" | "USER";
            isSuspended: boolean;
            createdAt: Date;
        };
        owner: {
            id: string;
            name: string;
            email: string;
            systemRole: "ADMIN" | "USER";
            isSuspended: boolean;
            createdAt: Date;
        };
        participants: {
            id: string;
            syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
            lastUpdatedAt: Date;
            taskId: string;
            userId: string;
            role: "contributor" | "helper" | "reviewer" | "observer";
            joinedAt: Date;
            user: {
                id: string;
                name: string;
                email: string;
                systemRole: "ADMIN" | "USER";
                isSuspended: boolean;
                createdAt: Date;
            };
        }[];
    }[]>;
    forceCloseTask(taskId: string, reason: string, adminId: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        createdAt: Date;
    }>;
    freezeTask(taskId: string, reason: string, adminId: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        createdAt: Date;
    }>;
    reopenTask(taskId: string, reason: string, adminId: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        createdAt: Date;
    }>;
    removeParticipant(taskId: string, userId: string, reason: string, adminId: string): Promise<{
        success: boolean;
    }>;
    findAllUsers(): Promise<{
        metrics: {
            activeTasks: number;
            blockedTasks: number;
            lastActivity: Date;
        };
        id: string;
        name: string;
        email: string;
        systemRole: "ADMIN" | "USER";
        isSuspended: boolean;
        createdAt: Date;
    }[]>;
    getUserDetails(userId: string): Promise<{
        tasksAsOwner: {
            id: string;
            createdAt: Date;
            description: string | null;
            title: string;
            assignedBy: string;
            responsibleOwner: string;
            status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
            syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
            lastUpdatedAt: Date;
        }[];
        tasksParticipating: {
            id: string;
            syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
            lastUpdatedAt: Date;
            taskId: string;
            userId: string;
            role: "contributor" | "helper" | "reviewer" | "observer";
            joinedAt: Date;
            task: {
                id: string;
                createdAt: Date;
                description: string | null;
                title: string;
                assignedBy: string;
                responsibleOwner: string;
                status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
                syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
                lastUpdatedAt: Date;
            };
        }[];
        totalTimeLogged: number;
        syncStats: {
            IN_SYNC: number;
            NEEDS_UPDATE: number;
            BLOCKED: number;
            HELP_REQUESTED: number;
        };
        id: string;
        name: string;
        email: string;
        systemRole: "ADMIN" | "USER";
        isSuspended: boolean;
        createdAt: Date;
    } | null>;
    updateUserRole(userId: string, role: 'ADMIN' | 'USER', reason: string, adminId: string): Promise<{
        id: string;
        name: string;
        email: string;
        systemRole: "ADMIN" | "USER";
        isSuspended: boolean;
        createdAt: Date;
    }>;
    suspendUser(userId: string, reason: string, adminId: string): Promise<{
        id: string;
        name: string;
        email: string;
        systemRole: "ADMIN" | "USER";
        isSuspended: boolean;
        createdAt: Date;
    }>;
    reactivateUser(userId: string, reason: string, adminId: string): Promise<{
        id: string;
        name: string;
        email: string;
        systemRole: "ADMIN" | "USER";
        isSuspended: boolean;
        createdAt: Date;
    }>;
    getHighRiskTasks(): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        title: string;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        assigner: {
            id: string;
            name: string;
            email: string;
            systemRole: "ADMIN" | "USER";
            isSuspended: boolean;
            createdAt: Date;
        };
        owner: {
            id: string;
            name: string;
            email: string;
            systemRole: "ADMIN" | "USER";
            isSuspended: boolean;
            createdAt: Date;
        };
    }[]>;
    getTransferAlerts(): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        title: string;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        assigner: {
            id: string;
            name: string;
            email: string;
            systemRole: "ADMIN" | "USER";
            isSuspended: boolean;
            createdAt: Date;
        };
        owner: {
            id: string;
            name: string;
            email: string;
            systemRole: "ADMIN" | "USER";
            isSuspended: boolean;
            createdAt: Date;
        };
    }[]>;
    getTasks(): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        title: string;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        assigner: {
            id: string;
            name: string;
            email: string;
            systemRole: "ADMIN" | "USER";
            isSuspended: boolean;
            createdAt: Date;
        };
        owner: {
            id: string;
            name: string;
            email: string;
            systemRole: "ADMIN" | "USER";
            isSuspended: boolean;
            createdAt: Date;
        };
        participants: {
            id: string;
            syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
            lastUpdatedAt: Date;
            taskId: string;
            userId: string;
            role: "contributor" | "helper" | "reviewer" | "observer";
            joinedAt: Date;
            user: {
                id: string;
                name: string;
                email: string;
                systemRole: "ADMIN" | "USER";
                isSuspended: boolean;
                createdAt: Date;
            };
        }[];
        syncLogs: {
            id: string;
            taskId: string | null;
            userId: string;
            action: string;
            timestamp: Date;
        }[];
        milestones: {
            id: string;
            createdAt: Date;
            title: string;
            taskId: string;
            isCompleted: string;
            dueDate: Date | null;
        }[];
        timeLogs: {
            id: string;
            description: string | null;
            taskId: string;
            userId: string;
            timestamp: Date;
            durationMinutes: string;
        }[];
    }[]>;
    getTask(id: string): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        title: string;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        assigner: {
            id: string;
            name: string;
            email: string;
            systemRole: "ADMIN" | "USER";
            isSuspended: boolean;
            createdAt: Date;
        };
        owner: {
            id: string;
            name: string;
            email: string;
            systemRole: "ADMIN" | "USER";
            isSuspended: boolean;
            createdAt: Date;
        };
        participants: {
            id: string;
            syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
            lastUpdatedAt: Date;
            taskId: string;
            userId: string;
            role: "contributor" | "helper" | "reviewer" | "observer";
            joinedAt: Date;
            user: {
                id: string;
                name: string;
                email: string;
                systemRole: "ADMIN" | "USER";
                isSuspended: boolean;
                createdAt: Date;
            };
        }[];
        syncLogs: {
            id: string;
            taskId: string | null;
            userId: string;
            action: string;
            timestamp: Date;
        }[];
        milestones: {
            id: string;
            createdAt: Date;
            title: string;
            taskId: string;
            isCompleted: string;
            dueDate: Date | null;
        }[];
        timeLogs: {
            id: string;
            description: string | null;
            taskId: string;
            userId: string;
            timestamp: Date;
            durationMinutes: string;
        }[];
    } | undefined>;
    getActivityPulse(): Promise<{
        id: string;
        taskId: string | null;
        userId: string;
        action: string;
        timestamp: Date;
        user: {
            id: string;
            name: string;
            email: string;
            systemRole: "ADMIN" | "USER";
            isSuspended: boolean;
            createdAt: Date;
        };
        task: {
            id: string;
            createdAt: Date;
            description: string | null;
            title: string;
            assignedBy: string;
            responsibleOwner: string;
            status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
            syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
            lastUpdatedAt: Date;
        } | null;
    }[]>;
    getSettings(): Promise<{
        id: string;
        staleThresholdHours: string;
        allowResponsibilityTransfer: boolean;
        enableHelperRole: boolean;
        updatedAt: Date;
    }>;
    updateSettings(data: any): Promise<{
        id: string;
        staleThresholdHours: string;
        allowResponsibilityTransfer: boolean;
        enableHelperRole: boolean;
        updatedAt: Date;
    }[]>;
    getGlobalAuditLogs(filters: {
        userId?: string;
        taskId?: string;
        action?: string;
        limit?: number;
    }): Promise<{
        id: string;
        taskId: string | null;
        userId: string;
        action: string;
        timestamp: Date;
        user: {
            name: string;
            email: string;
        };
        task: {
            title: string;
        } | null;
    }[]>;
    getSystemSnapshot(): Promise<{
        totalUsers: number;
        totalTasks: number;
        activeTasks: number;
        health: string;
        timestamp: Date;
    }>;
}

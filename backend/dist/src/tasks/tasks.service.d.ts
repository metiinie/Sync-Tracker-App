import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { SyncGateway } from '../sync/sync.gateway';
import { NotificationsService } from '../notifications/notifications.service';
export declare class TasksService {
    private db;
    private syncGateway;
    private notificationsService;
    constructor(db: NodePgDatabase<typeof schema>, syncGateway: SyncGateway, notificationsService: NotificationsService);
    create(title: string, description: string, assignedBy: string, responsibleOwner: string, participants?: {
        userId: string;
        role: string;
    }[], milestones?: string[], priority?: string): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        title: string;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        completedAt: Date | null;
    }>;
    addMilestone(taskId: string, title: string, userId: string, dueDate?: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        taskId: string;
        isCompleted: string;
        dueDate: Date | null;
    }>;
    updateMilestone(milestoneId: string, data: {
        title?: string;
        dueDate?: string;
        isCompleted?: boolean;
    }, userId: string): Promise<{
        id: string;
        taskId: string;
        title: string;
        isCompleted: string;
        dueDate: Date | null;
        createdAt: Date;
    }>;
    deleteMilestone(milestoneId: string, userId: string): Promise<{
        success: boolean;
    }>;
    toggleMilestone(milestoneId: string, isCompleted: boolean, userId: string): Promise<{
        id: string;
        taskId: string;
        title: string;
        isCompleted: string;
        dueDate: Date | null;
        createdAt: Date;
    }>;
    logTime(taskId: string, userId: string, durationMinutes: number | string, description: string): Promise<{
        description: string | null;
        id: string;
        taskId: string;
        userId: string;
        timestamp: Date;
        durationMinutes: string;
    }>;
    accept(taskId: string, userId: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        completedAt: Date | null;
        createdAt: Date;
    }>;
    complete(taskId: string, userId: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        completedAt: Date | null;
        createdAt: Date;
    }>;
    updateSyncState(taskId: string, userId: string, syncState: 'IN_SYNC' | 'NEEDS_UPDATE' | 'BLOCKED' | 'HELP_REQUESTED', note?: string): Promise<{
        success: boolean;
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
    }>;
    transfer(taskId: string, currentOwnerId: string, newOwnerId: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        completedAt: Date | null;
        createdAt: Date;
    }>;
    nudge(taskId: string, userId: string): Promise<{
        success: boolean;
    }>;
    addParticipant(taskId: string, userId: string, role: string, addedBy: string): Promise<{
        id: string;
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        taskId: string;
        userId: string;
        role: "contributor" | "helper" | "reviewer" | "observer";
        joinedAt: Date;
    }>;
    removeParticipant(taskId: string, userId: string, removedBy: string): Promise<{
        success: boolean;
    }>;
    findAllForUser(userId: string): Promise<any[]>;
    update(taskId: string, userId: string, data: {
        title?: string;
        description?: string;
        status?: string;
        priority?: string;
    }): Promise<{
        id: string;
        title: string;
        description: string | null;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        completedAt: Date | null;
        createdAt: Date;
    }>;
    delete(taskId: string, userId: string): Promise<{
        success: boolean;
    }>;
    addComment(taskId: string, userId: string, content: string): Promise<{
        id: string;
        createdAt: Date;
        taskId: string;
        userId: string;
        content: string;
        user: {
            id: string;
            name: string;
            email: string;
            isSuspended: boolean;
            createdAt: Date;
        };
    } | undefined>;
    getComments(taskId: string): Promise<{
        id: string;
        createdAt: Date;
        taskId: string;
        userId: string;
        content: string;
        user: {
            id: string;
            name: string;
            email: string;
            isSuspended: boolean;
            createdAt: Date;
        };
    }[]>;
    findOne(taskId: string): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        title: string;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        completedAt: Date | null;
        assigner: {
            id: string;
            name: string;
            email: string;
            isSuspended: boolean;
            createdAt: Date;
        };
        owner: {
            id: string;
            name: string;
            email: string;
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
            user: {
                id: string;
                name: string;
                email: string;
                isSuspended: boolean;
                createdAt: Date;
            };
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
            description: string | null;
            id: string;
            taskId: string;
            userId: string;
            timestamp: Date;
            durationMinutes: string;
            user: {
                id: string;
                name: string;
                email: string;
                isSuspended: boolean;
                createdAt: Date;
            };
        }[];
        comments: {
            id: string;
            createdAt: Date;
            taskId: string;
            userId: string;
            content: string;
            user: {
                id: string;
                name: string;
                email: string;
                isSuspended: boolean;
                createdAt: Date;
            };
        }[];
    } | undefined>;
    getUserStats(userId: string): Promise<{
        active: number;
        pending: number;
        blocked: number;
        helpRequested: number;
        delegated: number;
        totalTimeMins: number;
        syncStates: {
            IN_SYNC: number;
            NEEDS_UPDATE: number;
            BLOCKED: number;
            HELP_REQUESTED: number;
        };
    }>;
    syncParticipant(taskId: string, userId: string): Promise<{
        success: boolean;
    }>;
    syncAll(userId: string): Promise<{
        success: boolean;
        ownedCount: number;
        participationCount: number;
    }>;
    private logAction;
}

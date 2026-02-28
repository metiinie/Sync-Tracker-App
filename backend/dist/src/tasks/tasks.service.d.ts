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
    }[], milestones?: string[]): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        title: string;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
    }>;
    addMilestone(taskId: string, title: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        taskId: string;
        isCompleted: string;
        dueDate: Date | null;
    }>;
    toggleMilestone(milestoneId: string, isCompleted: boolean, userId: string): Promise<{
        id: string;
        taskId: string;
        title: string;
        isCompleted: string;
        dueDate: Date | null;
        createdAt: Date;
    }>;
    logTime(taskId: string, userId: string, durationMinutes: string, description: string): Promise<{
        id: string;
        description: string | null;
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
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        createdAt: Date;
    }>;
    updateSyncState(taskId: string, userId: string, syncState: 'IN_SYNC' | 'NEEDS_UPDATE' | 'BLOCKED' | 'HELP_REQUESTED'): Promise<{
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
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        createdAt: Date;
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
    findAllForUser(userId: string): Promise<any[]>;
    findOne(taskId: string): Promise<{
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
            user: {
                id: string;
                name: string;
                email: string;
                systemRole: "ADMIN" | "USER";
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
    private logAction;
}

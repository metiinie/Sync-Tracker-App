import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { SyncGateway } from '../sync/sync.gateway';
export declare class TasksService {
    private db;
    private syncGateway;
    constructor(db: NodePgDatabase<typeof schema>, syncGateway: SyncGateway);
    create(title: string, description: string, assignedBy: string, responsibleOwner: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        createdAt: Date;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
    }>;
    accept(taskId: string, userId: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
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
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        createdAt: Date;
    }>;
    addParticipant(taskId: string, userId: string, role: string, addedBy: string): Promise<{
        id: string;
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        taskId: string;
        userId: string;
        role: "contributor" | "helper" | "reviewer" | "observer";
        joinedAt: Date;
        lastUpdatedAt: Date;
    }>;
    findAllForUser(userId: string): Promise<any[]>;
    private logAction;
}

import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { SyncGateway } from '../sync/sync.gateway';
export declare class NotificationsService {
    private db;
    private syncGateway;
    constructor(db: NodePgDatabase<typeof schema>, syncGateway: SyncGateway);
    create(userId: string, taskId: string | null, type: string, content: string): Promise<{
        id: string;
        createdAt: Date;
        taskId: string | null;
        userId: string;
        content: string;
        type: string;
        isRead: string;
    }>;
    findAllForUser(userId: string): Promise<{
        id: string;
        createdAt: Date;
        taskId: string | null;
        userId: string;
        content: string;
        type: string;
        isRead: string;
        task: {
            id: string;
            createdAt: Date;
            description: string | null;
            title: string;
            assignedBy: string;
            responsibleOwner: string;
            status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
            priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
            syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
            lastUpdatedAt: Date;
            completedAt: Date | null;
        } | null;
    }[]>;
    markAsRead(notificationId: string, userId: string): Promise<{
        id: string;
        userId: string;
        taskId: string | null;
        type: string;
        content: string;
        isRead: string;
        createdAt: Date;
    }>;
}

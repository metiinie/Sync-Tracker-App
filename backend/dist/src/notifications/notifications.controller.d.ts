import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(req: any): Promise<{
        id: string;
        createdAt: Date;
        taskId: string | null;
        userId: string;
        content: string;
        type: string;
        isRead: string;
        task: {
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
        } | null;
    }[]>;
    markAsRead(id: string, req: any): Promise<{
        id: string;
        userId: string;
        taskId: string | null;
        type: string;
        content: string;
        isRead: string;
        createdAt: Date;
    }>;
}

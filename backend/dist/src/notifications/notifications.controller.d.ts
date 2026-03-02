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
        activityId: string | null;
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
    markAsRead(id: string, req: any): Promise<{
        id: string;
        userId: string;
        taskId: string | null;
        activityId: string | null;
        type: string;
        content: string;
        isRead: string;
        createdAt: Date;
    }>;
}

import { TasksService } from './tasks.service';
export declare class TasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    create(body: any, req: any): Promise<{
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
    accept(id: string, req: any): Promise<{
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
    updateSync(id: string, body: {
        syncState: any;
        note?: string;
    }, req: any): Promise<{
        success: boolean;
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
    }>;
    transfer(id: string, newOwnerId: string, req: any): Promise<{
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
    addParticipant(id: string, body: any, req: any): Promise<{
        id: string;
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        taskId: string;
        userId: string;
        role: "contributor" | "helper" | "reviewer" | "observer";
        joinedAt: Date;
    }>;
    removeParticipant(id: string, userId: string, req: any): Promise<{
        success: boolean;
    }>;
    findAll(req: any): Promise<any[]>;
    findOne(id: string): Promise<{
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
    addMilestone(id: string, body: {
        title: string;
        dueDate?: string;
    }, req: any): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        taskId: string;
        isCompleted: string;
        dueDate: Date | null;
    }>;
    updateMilestone(mid: string, body: any, req: any): Promise<{
        id: string;
        taskId: string;
        title: string;
        isCompleted: string;
        dueDate: Date | null;
        createdAt: Date;
    }>;
    deleteMilestone(mid: string, req: any): Promise<{
        success: boolean;
    }>;
    toggleMilestone(mid: string, isCompleted: boolean, req: any): Promise<{
        id: string;
        taskId: string;
        title: string;
        isCompleted: string;
        dueDate: Date | null;
        createdAt: Date;
    }>;
    logTime(id: string, body: any, req: any): Promise<{
        description: string | null;
        id: string;
        taskId: string;
        userId: string;
        timestamp: Date;
        durationMinutes: string;
    }>;
    syncAll(req: any): Promise<{
        success: boolean;
        ownedCount: number;
        participationCount: number;
    }>;
    syncParticipant(id: string, req: any): Promise<{
        success: boolean;
    }>;
    update(id: string, body: any, req: any): Promise<{
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
    delete(id: string, req: any): Promise<{
        success: boolean;
    }>;
    addComment(id: string, content: string, req: any): Promise<{
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
    getComments(id: string): Promise<{
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
    nudge(id: string, req: any): Promise<{
        success: boolean;
    }>;
    complete(id: string, req: any): Promise<{
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
}

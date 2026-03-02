import { TasksService } from './tasks.service';
export declare class TasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    create(body: any, req: any): Promise<{
        id: string;
        title: string;
        description: string | null;
        createdAt: Date;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
    }>;
    accept(id: string, req: any): Promise<{
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
    updateSync(id: string, syncState: any, req: any): Promise<{
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
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
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
    findAll(req: any): Promise<any[]>;
    findOne(id: string): Promise<{
        id: string;
        title: string;
        description: string | null;
        createdAt: Date;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        milestones: {
            id: string;
            title: string;
            createdAt: Date;
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
                isSuspended: boolean;
                createdAt: Date;
            };
        }[];
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
    } | undefined>;
    addMilestone(id: string, title: string, req: any): Promise<{
        id: string;
        title: string;
        createdAt: Date;
        taskId: string;
        isCompleted: string;
        dueDate: Date | null;
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
        id: string;
        description: string | null;
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
    nudge(id: string, req: any): Promise<{
        success: boolean;
    }>;
}

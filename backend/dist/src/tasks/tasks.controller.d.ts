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
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
    }>;
    accept(id: string, req: any): Promise<{
        id: string;
        title: string;
        description: string | null;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
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
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        createdAt: Date;
    }>;
    addParticipant(id: string, body: any, req: any): Promise<{
        id: string;
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        taskId: string;
        userId: string;
        role: "contributor" | "helper" | "reviewer" | "observer";
        joinedAt: Date;
        lastUpdatedAt: Date;
    }>;
    findAll(req: any): Promise<any[]>;
}

import { TasksService } from './tasks.service';
export declare class TasksController {
    private readonly tasksService;
    constructor(tasksService: TasksService);
    create(body: any, req: any): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        title: string;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
    }>;
    accept(id: string, req: any): Promise<{
        id: string;
        title: string;
        description: string | null;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
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
        createdAt: Date;
    }>;
    addParticipant(id: string, body: any, req: any): Promise<{
        id: string;
        taskId: string;
        userId: string;
        role: "contributor" | "helper" | "reviewer" | "observer";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        joinedAt: Date;
        lastUpdatedAt: Date;
    }>;
    findAll(req: any): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        title: string;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
    }[]>;
}

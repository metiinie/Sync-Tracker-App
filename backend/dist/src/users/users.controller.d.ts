import { UsersService } from './users.service';
import { TasksService } from '../tasks/tasks.service';
export declare class UsersController {
    private readonly usersService;
    private readonly tasksService;
    constructor(usersService: UsersService, tasksService: TasksService);
    getStats(req: any): Promise<{
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
    search(query: string): Promise<{
        id: string;
        name: string;
        email: string;
        createdAt: Date;
    }[]>;
    findAll(): Promise<{
        id: string;
        name: string;
        email: string;
        createdAt: Date;
    }[]>;
}

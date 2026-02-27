import { UsersService } from './users.service';
import { TasksService } from '../tasks/tasks.service';
export declare class UsersController {
    private readonly usersService;
    private readonly tasksService;
    constructor(usersService: UsersService, tasksService: TasksService);
    search(query: string): Promise<{
        id: string;
        name: string;
        email: string;
        systemRole: "ADMIN" | "USER";
        isSuspended: boolean;
        createdAt: Date;
    }[]>;
    findAll(): Promise<{
        id: string;
        name: string;
        email: string;
        systemRole: "ADMIN" | "USER";
        isSuspended: boolean;
        createdAt: Date;
    }[]>;
}

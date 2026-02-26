import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
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

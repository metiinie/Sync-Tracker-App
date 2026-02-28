import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
export declare class UsersService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    search(query: string): Promise<{
        id: string;
        name: string;
        email: string;
        isSuspended: boolean;
        createdAt: Date;
    }[]>;
    findAll(): Promise<{
        id: string;
        name: string;
        email: string;
        isSuspended: boolean;
        createdAt: Date;
    }[]>;
}

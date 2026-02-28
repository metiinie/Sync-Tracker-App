import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
export declare class AuthService {
    private db;
    constructor(db: NodePgDatabase<typeof schema>);
    getOrCreateUser(payload: any): Promise<{
        id: string;
        name: string;
        email: string;
        isSuspended: boolean;
        createdAt: Date;
    }>;
}

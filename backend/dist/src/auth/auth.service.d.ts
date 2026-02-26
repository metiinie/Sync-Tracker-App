import { JwtService } from '@nestjs/jwt';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
export declare class AuthService {
    private db;
    private jwtService;
    constructor(db: NodePgDatabase<typeof schema>, jwtService: JwtService);
    register(name: string, email: string, password: string): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            email: any;
        };
    }>;
    login(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            email: any;
        };
    }>;
    validateUser(email: string, pass: string): Promise<any>;
    validateOAuthUser(profile: any): Promise<any>;
}

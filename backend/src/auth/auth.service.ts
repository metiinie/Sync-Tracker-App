import { Injectable, Inject, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    ) { }

    async getOrCreateUser(payload: any) {
        const userId = payload.sub;
        const email = payload.email || payload.user_metadata?.email;
        const name = payload.user_metadata?.full_name || email?.split('@')[0];

        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] [Auth Service] Syncing user: ${email} (ID: ${userId})`);

        try {
            const existingUser = await this.db.query.users.findFirst({
                where: eq(schema.users.id, userId),
            });

            if (existingUser) {
                console.log(`[${timestamp}] [Auth Service] Existing user found. Role: ${existingUser.systemRole}`);
                return existingUser;
            }

            console.log(`[${timestamp}] [Auth Service] New user detected. Creating DB record...`);
            const [newUser] = await this.db.insert(schema.users).values({
                id: userId,
                email: email,
                name: name,
                systemRole: 'USER',
            }).returning();

            console.log(`[${timestamp}] [Auth Service] Successfully created user record for: ${email}`);
            return newUser;
        } catch (error) {
            console.error(`[${timestamp}] [Auth Service] CRITICAL DATABASE ERROR:`, error.message);
            throw error;
        }
    }
}

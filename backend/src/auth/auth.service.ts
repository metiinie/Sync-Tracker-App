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
        const email = payload.email;
        const name = payload.user_metadata?.full_name || email;

        const existing = await this.db.query.users.findFirst({
            where: eq(schema.users.id, userId),
        });

        if (existing) {
            return existing;
        }

        const [user] = await this.db.insert(schema.users).values({
            id: userId,
            name,
            email,
        }).returning();

        return user;
    }
}

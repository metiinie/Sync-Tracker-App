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
        private jwtService: JwtService,
    ) { }

    async register(name: string, email: string, password: string) {
        const existing = await this.db.query.users.findFirst({
            where: eq(schema.users.email, email),
        });

        if (existing) {
            throw new ConflictException('Email already exists');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const [user] = await this.db.insert(schema.users).values({
            name,
            email,
            passwordHash,
        }).returning();

        return this.login(user); // Automatically login after register
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user.id, name: user.name };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        };
    }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.db.query.users.findFirst({
            where: eq(schema.users.email, email),
        });

        if (user && (await bcrypt.compare(pass, user.passwordHash))) {
            const { passwordHash, ...result } = user;
            return result;
        }
        return null;
    }
}

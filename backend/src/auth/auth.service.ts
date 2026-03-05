import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, or } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) { }

  async getOrCreateUser(payload: any) {
    const userId = payload.sub;
    const email = payload.email;
    const name = payload.user_metadata?.full_name || email;

    const existing = await this.db.query.users.findFirst({
      where: or(eq(schema.users.id, userId), eq(schema.users.email, email)),
    });

    if (existing) {
      if (existing.isSuspended) {
        throw new UnauthorizedException(
          'Your account has been suspended.',
        );
      }
      return existing;
    }

    try {
      const [user] = await this.db
        .insert(schema.users)
        .values({
          id: userId,
          name,
          email,
          googleId: payload.app_metadata?.provider === 'google' ? payload.sub : null,
        })
        .onConflictDoUpdate({
          target: schema.users.id,
          set: { name, email }, // Optionally update name/email
        })
        .returning();
      return user;
    } catch (error) {
      // Fallback in case onConflict isn't supported or fails unexpectedly
      const fallbackUser = await this.db.query.users.findFirst({
        where: eq(schema.users.id, userId),
      });
      if (fallbackUser) return fallbackUser;
      throw error;
    }
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { ilike, or } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  async search(query: string) {
    return this.db.query.users.findMany({
      where: or(
        ilike(schema.users.name, `%${query}%`),
        ilike(schema.users.email, `%${query}%`),
      ),
      limit: 10,
    });
  }

  async findAll() {
    return this.db.query.users.findMany({
      limit: 50,
    });
  }
}

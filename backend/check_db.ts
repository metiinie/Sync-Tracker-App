
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './src/db/schema';

const DATABASE_URL = 'postgresql://neondb_owner:npg_m60etzgfAHXR@ep-plain-fog-aithzseg-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=verify-full';

async function check() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
    const db = drizzle(pool, { schema });
    try {
        const users = await db.select().from(schema.users);
        console.log(`Users count: ${users.length}`);
        const tasks = await db.select().from(schema.tasks);
        console.log(`Tasks count: ${tasks.length}`);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './src/db/schema';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool, { schema });

async function test() {
    try {
        const userId = '9ff61c2d-1f57-42da-94e7-953963616003';
        console.log('Running query...');
        let settings = await db.query.userSettings.findFirst({
            where: eq(schema.userSettings.userId, userId),
        });
        console.log('Settings:', settings);

        if (!settings) {
            console.log('No settings found. Trying to insert...', {
                userId,
                theme: 'light',
                inAppNotif: true,
                emailDigest: false,
                realTimeSync: true,
            });
            const [newSettings] = await db
                .insert(schema.userSettings)
                .values({
                    userId,
                    theme: 'light',
                    inAppNotif: true,
                    emailDigest: false,
                    realTimeSync: true,
                })
                .returning();
            console.log('Inserted:', newSettings);
        }
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        pool.end();
    }
}
test();

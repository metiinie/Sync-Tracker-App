import { Client } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkDb() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const res = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'tasks';
    `);

        console.log('Tables named "tasks":');
        res.rows.forEach(row => {
            console.log(`- ${row.table_schema}.${row.table_name}`);
        });

        const typesRes = await client.query(`
      SELECT n.nspname as schema, t.typname as type 
      FROM pg_type t 
      JOIN pg_namespace n ON n.oid = t.typnamespace 
      WHERE t.typtype = 'e';
    `);

        console.log('\nEnum types in database:');
        typesRes.rows.forEach(row => {
            console.log(`- ${row.schema}.${row.type}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkDb();

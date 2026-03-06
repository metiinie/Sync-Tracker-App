import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const res = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_settings'
      ORDER BY ordinal_position;
    `);

        console.log('Columns in user_settings:');
        res.rows.forEach(row => {
            console.log(`- ${row.column_name}: ${row.data_type} (Default: ${row.column_default}, Nullable: ${row.is_nullable})`);
        });

        console.log('\nVerification complete.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

main();

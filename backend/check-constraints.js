
require('dotenv').config();
const { Client } = require('pg');

async function checkConstraints() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const res = await client.query(`
            SELECT table_name, column_name, is_nullable, column_default, data_type
            FROM information_schema.columns
            WHERE table_name = 'user_settings'
            AND table_schema = 'public';
        `);
        console.log('Columns in user_settings:');
        console.table(res.rows);

        const pkRes = await client.query(`
            SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type
            FROM   pg_index i
            JOIN   pg_attribute a ON a.attrelid = i.indrelid
                                 AND a.attnum = ANY(i.indkey)
            WHERE  i.indrelid = 'user_settings'::regclass
            AND    i.indisprimary;
        `);
        console.log('Primary Key(s) in user_settings:');
        console.table(pkRes.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkConstraints();

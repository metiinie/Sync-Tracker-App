
require('dotenv').config();
const { Client } = require('pg');

async function checkAllTables() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const res = await client.query(`
            SELECT table_name, column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position;
        `);

        const tables = {};
        res.rows.forEach(row => {
            if (!tables[row.table_name]) {
                tables[row.table_name] = [];
            }
            tables[row.table_name].push({
                column: row.column_name,
                type: row.data_type,
                default: row.column_default
            });
        });

        for (const [table, columns] of Object.entries(tables)) {
            console.log(`\nTable: ${table}`);
            columns.forEach(col => {
                console.log(`- ${col.column}: ${col.type} (Default: ${col.default})`);
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkAllTables();

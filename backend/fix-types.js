
require('dotenv').config();
const { Client } = require('pg');

async function fixTypes() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        console.log('Fixing milestones.is_completed...');
        await client.query(`
            ALTER TABLE milestones 
            ALTER COLUMN is_completed TYPE boolean 
            USING (is_completed::boolean);
        `);

        console.log('Fixing notifications.is_read...');
        await client.query(`
            ALTER TABLE notifications 
            ALTER COLUMN is_read TYPE boolean 
            USING (is_read::boolean);
        `);

        console.log('Successfully updated both columns to boolean.');

    } catch (err) {
        console.error('Error fixing types:', err.message);
        console.log('Attempting alternative fix (if already boolean but metadata is weird)...');
        try {
            // Just ensure defaults and nullability are correct as per schema
            await client.query('ALTER TABLE milestones ALTER COLUMN is_completed SET DEFAULT false');
            await client.query('ALTER TABLE milestones ALTER COLUMN is_completed SET NOT NULL');
            await client.query('ALTER TABLE notifications ALTER COLUMN is_read SET DEFAULT false');
            await client.query('ALTER TABLE notifications ALTER COLUMN is_read SET NOT NULL');
            console.log('Alternative metadata fix applied.');
        } catch (e2) {
            console.error('Alternative fix also failed:', e2.message);
        }
    } finally {
        await client.end();
    }
}

fixTypes();

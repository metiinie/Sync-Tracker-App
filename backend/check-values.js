
require('dotenv').config();
const { Client } = require('pg');

async function checkValues(userId) {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const res = await client.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
        if (res.rows.length > 0) {
            const row = res.rows[0];
            console.log('User settings row:', row);
            console.log('Types:');
            for (let key in row) {
                console.log(`${key}: ${typeof row[key]} (${row[key]})`);
            }
        } else {
            console.log('User NOT found in user_settings.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

const userId = '9ff61c2d-1f57-42da-94e7-953963616003';
checkValues(userId);

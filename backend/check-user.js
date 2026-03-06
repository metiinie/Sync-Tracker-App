
require('dotenv').config();
const { Client } = require('pg');

async function checkUser(userId) {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const res = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (res.rows.length === 0) {
            console.log('User NOT found in local database.');
            const allUsers = await client.query('SELECT count(*) FROM users');
            console.log('Total users in local DB:', allUsers.rows[0].count);
        } else {
            console.log('User found:', res.rows[0]);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

const userId = '9ff61c2d-1f57-42da-94e7-953963616003';
checkUser(userId);

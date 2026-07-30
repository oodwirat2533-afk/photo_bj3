require('dotenv').config({path: '.env.local'});
const { sql } = require('@vercel/postgres');
sql`SELECT * FROM users`.then(r => console.log(r.rows)).catch(console.error);

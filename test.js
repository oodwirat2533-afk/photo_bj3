const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });
sql`SELECT * FROM users`.then(r => console.log(r.rows)).catch(e => console.error(e));

require('dotenv').config({path: '.env.local'});
const { sql } = require('@vercel/postgres');
async function seed() {
  await sql`INSERT INTO users (email, role, is_onboarded) VALUES ('ood.wirat2533@banhan3.ac.th', 'superadmin', true) ON CONFLICT (email) DO NOTHING;`;
  await sql`INSERT INTO users (email, role, is_onboarded) VALUES ('ood.wirat2533@gmail.com', 'superadmin', true) ON CONFLICT (email) DO NOTHING;`;
  const res = await sql`SELECT * FROM users;`;
  console.log(res.rows);
}
seed().catch(console.error);

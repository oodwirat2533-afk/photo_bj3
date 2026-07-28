require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function main() {
  try {
    console.log('Connecting to Postgres Database...');
    
    // Ensure connection string exists
    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
      if (process.env.DATABASE_URL) {
        process.env.POSTGRES_URL = process.env.DATABASE_URL;
      } else {
        throw new Error('ไม่พบ POSTGRES_URL หรือ DATABASE_URL ในไฟล์ .env.local');
      }
    } else if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
      process.env.POSTGRES_URL = process.env.DATABASE_URL;
    }

    // Create admin_emails table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_emails (
        email VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✅ Created admin_emails table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

main();

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

    // Create folder_permissions table
    await sql`
      CREATE TABLE IF NOT EXISTS folder_permissions (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
        folder_id VARCHAR(255) NOT NULL,
        can_manage BOOLEAN DEFAULT TRUE,
        include_subfolders BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_email, folder_id)
      );
    `;
    console.log('✅ Created folder_permissions table');

    console.log('🎉 Database migration complete successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

main();

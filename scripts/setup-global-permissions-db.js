require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function main() {
  try {
    console.log('Connecting to Postgres Database...');
    
    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
      if (process.env.DATABASE_URL) {
        process.env.POSTGRES_URL = process.env.DATABASE_URL;
      } else {
        throw new Error('ไม่พบ POSTGRES_URL หรือ DATABASE_URL ในไฟล์ .env.local');
      }
    } else if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
      process.env.POSTGRES_URL = process.env.DATABASE_URL;
    }

    console.log('Dropping existing folder_permissions table...');
    await sql`DROP TABLE IF EXISTS folder_permissions;`;
    
    console.log('Creating global folder_permissions table...');
    await sql`
      CREATE TABLE folder_permissions (
        folder_id VARCHAR(255) PRIMARY KEY,
        can_manage BOOLEAN DEFAULT TRUE,
        include_subfolders BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✅ Created global folder_permissions table');

    console.log('🎉 Database migration complete successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

main();

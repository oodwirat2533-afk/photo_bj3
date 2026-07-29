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

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(255) PRIMARY KEY,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        title VARCHAR(50),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        subject_group VARCHAR(255),
        is_onboarded BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✅ Created users table');

    // Optionally migrate from admin_emails
    try {
      const existingAdmins = await sql`SELECT email FROM admin_emails`;
      if (existingAdmins.rows && existingAdmins.rows.length > 0) {
        console.log(`Migrating ${existingAdmins.rows.length} existing admins...`);
        for (const admin of existingAdmins.rows) {
          await sql`
            INSERT INTO users (email, role, is_onboarded)
            VALUES (${admin.email}, 'admin', FALSE)
            ON CONFLICT (email) DO NOTHING;
          `;
        }
        console.log('✅ Migrated existing admin_emails to users table');
      }
    } catch (e) {
      console.log('ℹ️ admin_emails table not found or error migrating, skipping...');
    }

    console.log('🎉 Database migration complete successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

main();

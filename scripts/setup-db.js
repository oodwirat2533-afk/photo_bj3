require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');

async function main() {
  try {
    console.log('Connecting to Postgres Database...');
    
    // Ensure connection string exists
    if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
      // If DATABASE_URL exists, set POSTGRES_URL to it for @vercel/postgres
      if (process.env.DATABASE_URL) {
        process.env.POSTGRES_URL = process.env.DATABASE_URL;
      } else {
        throw new Error('ไม่พบ POSTGRES_URL หรือ DATABASE_URL ในไฟล์ .env.local');
      }
    } else if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) {
      process.env.POSTGRES_URL = process.env.DATABASE_URL;
    }

    // Create admins table
    await sql`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✅ Created admins table');

    // Create drive_urls table
    await sql`
      CREATE TABLE IF NOT EXISTS drive_urls (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✅ Created drive_urls table');

    // Create hidden_folders table
    await sql`
      CREATE TABLE IF NOT EXISTS hidden_folders (
        folder_id VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('✅ Created hidden_folders table');

    // Insert a default admin (admin / admin123) if none exists
    const adminCheck = await sql`SELECT * FROM admins WHERE username = 'admin'`;
    if (adminCheck.rowCount === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await sql`
        INSERT INTO admins (username, password_hash)
        VALUES ('admin', ${hash})
      `;
      console.log('✅ Inserted default admin (User: admin, Pass: admin123)');
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    console.log('🎉 Database setup complete successfully!');
  } catch (error) {
    console.error('❌ Error setting up database:', error);
  }
}

main();

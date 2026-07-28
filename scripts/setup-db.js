const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');

async function main() {
  try {
    // Create admins table
    await sql`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Created admins table');

    // Create drive_urls table
    await sql`
      CREATE TABLE IF NOT EXISTS drive_urls (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Created drive_urls table');

    // Insert a default admin (admin / admin123) if none exists
    const adminCheck = await sql`SELECT * FROM admins WHERE username = 'admin'`;
    if (adminCheck.rowCount === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await sql`
        INSERT INTO admins (username, password_hash)
        VALUES ('admin', ${hash})
      `;
      console.log('Inserted default admin');
    }

    console.log('Database setup complete');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

main();

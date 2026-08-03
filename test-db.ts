import { sql } from '@vercel/postgres';
import { loadEnvConfig } from '@next/env';
import { getDriveAccessToken } from './lib/google-auth';

loadEnvConfig(process.cwd());

async function main() {
  try {
    const res = await sql`SELECT * FROM folder_permissions`;
    console.log('Permissions:', res.rows);

    const token = await getDriveAccessToken();
    const folderId = res.rows[0]?.folder_id;
    if (folderId) {
      const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=name,parents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await driveRes.json();
      console.log('Permitted folder info:', data);
    }
  } catch (err) {
    console.error(err);
  }
}

main();

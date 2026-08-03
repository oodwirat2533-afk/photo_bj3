import { verifyFolderAccess } from './lib/permissions';
import { sql } from './lib/db';
import { getDriveAccessToken } from './lib/google-auth';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function main() {
  try {
    const token = await getDriveAccessToken();
    const q = `name='photo_1_2569' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const driveData = await driveRes.json();
    console.log('photo_1_2569:', driveData.files);

    if (driveData.files && driveData.files.length > 0) {
      const folderId = driveData.files[0].id;
      console.log('Testing access for folder ID:', folderId);
      
      const hasAccessAdmin = await verifyFolderAccess(folderId, 'admin');
      console.log('hasAccessAdmin:', hasAccessAdmin);
      
      const hasAccessAssistant = await verifyFolderAccess(folderId, 'assistant_admin');
      console.log('hasAccessAssistant:', hasAccessAssistant);
    }
  } catch (err) {
    console.error(err);
  }
}

main();

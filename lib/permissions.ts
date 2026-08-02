import { sql } from '@/lib/db';
import { getDriveAccessToken } from '@/lib/google-auth';

export async function verifyFolderAccess(targetFolderId: string, userRole: string): Promise<boolean> {
  // Superadmin always has access
  if (userRole === 'superadmin') {
    return true;
  }

  // Get global permissions from DB
  const res = await sql`SELECT folder_id, include_subfolders FROM folder_permissions WHERE can_manage = TRUE`;
  const perms = res.rows;

  if (perms.length === 0) {
    return false;
  }

  try {
    const token = await getDriveAccessToken();
    let currentId = targetFolderId;
    const maxDepth = 20; // Prevent infinite loops
    let depth = 0;

    while (currentId && depth < maxDepth) {
      // Check permission on currentId
      const perm = perms.find((p) => p.folder_id === currentId);
      if (perm) {
        // If it's the exact target folder, access is granted
        if (currentId === targetFolderId) return true;
        // If it's a parent folder and include_subfolders is true, access is granted
        if (perm.include_subfolders) return true;
      }

      // Fetch parent of currentId from Google Drive
      const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${currentId}?fields=parents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!driveRes.ok) {
        break; // If we can't read the file/folder, stop
      }
      
      const driveData = await driveRes.json();
      if (driveData.parents && driveData.parents.length > 0) {
        currentId = driveData.parents[0]; // Move up the tree
      } else {
        break; // Reached the root or a folder with no parents
      }
      
      depth++;
    }
  } catch (error) {
    console.error('Error verifying folder access:', error);
  }

  return false;
}

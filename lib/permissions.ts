import { sql } from '@/lib/db';
import { getDriveAccessToken } from '@/lib/google-auth';

export async function verifyFolderAccess(targetFolderId: string, userRole: string): Promise<boolean> {
  // Superadmin always has access
  if (userRole === 'superadmin') {
    return true;
  }

  // Run DB and Token fetching in parallel to save time
  const [dbRes, token] = await Promise.all([
    sql`SELECT folder_id, can_manage, include_subfolders FROM folder_permissions`,
    getDriveAccessToken()
  ]);
  
  const perms = dbRes.rows;

  if (perms.length === 0) {
    return false;
  }

  // Quick check: is the exact target folder explicitly defined?
  const directPerm = perms.find((p) => p.folder_id === targetFolderId);
  if (directPerm) {
    return directPerm.can_manage;
  }

  try {
    // Walk up from target folder, checking each ancestor against permissions
    let currentId: string = targetFolderId;
    const maxDepth = 10; // reasonable limit for folder depth
    let depth = 0;

    while (currentId && depth < maxDepth) {
      // Fetch just the parent of the current folder
      const url = `https://www.googleapis.com/drive/v3/files/${currentId}?fields=parents&supportsAllDrives=true`;
      const driveRes = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!driveRes.ok) {
        if (driveRes.status !== 404) {
          console.error(`Drive API error fetching parents for ${currentId}:`, driveRes.status);
        }
        break;
      }
      
      const data = await driveRes.json();
      
      if (!data.parents || data.parents.length === 0) {
        break; // Reached the root or no parents available
      }
      
      // Move to parent
      currentId = data.parents[0];

      // Check if this parent has a permission record
      const perm = perms.find((p) => p.folder_id === currentId);
      if (perm && perm.include_subfolders) {
        // Return the first explicitly defined permission we encounter up the tree
        return perm.can_manage;
      }
      
      depth++;
    }
  } catch (error) {
    console.error('Error verifying folder access:', error);
  }

  return false;
}

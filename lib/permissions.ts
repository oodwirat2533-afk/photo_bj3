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

  // Quick check: is the exact target folder permitted?
  const directPerm = perms.find((p) => p.folder_id === targetFolderId);
  if (directPerm) {
    return true;
  }

  // Need to walk up the tree. Fetch ALL folders from Drive to build the tree in memory.
  // This avoids multiple sequential API calls and Shared Drive compatibility issues.
  try {
    const token = await getDriveAccessToken();
    const q = `mimeType='application/vnd.google-apps.folder' and trashed=false`;
    
    let allFolders: { id: string; parents?: string[] }[] = [];
    let pageToken = '';
    
    do {
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&corpora=allDrives&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=files(id,parents),nextPageToken&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const driveRes = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!driveRes.ok) {
        console.error('Drive API error in verifyFolderAccess:', driveRes.status, await driveRes.text());
        break;
      }
      
      const data = await driveRes.json();
      if (data.files) {
        allFolders = allFolders.concat(data.files);
      }
      pageToken = data.nextPageToken || '';
    } while (pageToken);

    // Build a map: folderId -> parentId
    const parentMap = new Map<string, string>();
    for (const folder of allFolders) {
      if (folder.parents && folder.parents.length > 0) {
        parentMap.set(folder.id, folder.parents[0]);
      }
    }
    
    console.log('[DEBUG] verifyFolderAccess - parentMap size:', parentMap.size);
    console.log('[DEBUG] verifyFolderAccess - targetFolder parent:', parentMap.get(targetFolderId));

    // Walk up from target folder, checking each ancestor against permissions
    let currentId: string | undefined = targetFolderId;
    const maxDepth = 30;
    let depth = 0;

    while (currentId && depth < maxDepth) {
      // Move to parent
      currentId = parentMap.get(currentId);
      if (!currentId) break;

      const perm = perms.find((p) => p.folder_id === currentId);
      if (perm && perm.include_subfolders) {
        return true;
      }
      
      depth++;
    }
  } catch (error) {
    console.error('Error verifying folder access:', error);
  }

  return false;
}

import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getDriveAccessToken } from '@/lib/google-auth';
import { sql } from '@/lib/db';
import { verifyFolderAccess } from '@/lib/permissions';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { folderName, parentFolderId } = await request.json();

    if (!folderName || !parentFolderId) {
      return NextResponse.json({ error: 'Missing folderName or parentFolderId' }, { status: 400 });
    }

    // Role check logic
    const userRole = session.user.role;
    
    // Assistant admin cannot create folders at all
    if (userRole === 'assistant_admin') {
      return NextResponse.json({ error: 'Permission denied. Assistant admin cannot create folders.' }, { status: 403 });
    }

    // Check if the parent folder is the root folder
    const result = await sql`SELECT url FROM drive_urls ORDER BY created_at DESC LIMIT 1`;
    const row = result.rows.length > 0 ? result.rows[0] : null;

    let rootFolderId = null;
    if (row && row.url) {
      const match = row.url.match(/folders\/([a-zA-Z0-9-_]+)/);
      if (match) {
        rootFolderId = match[1];
      }
    }

    if (parentFolderId === rootFolderId) {
      // Only superadmin can create folders in the root
      if (userRole !== 'superadmin') {
        return NextResponse.json({ error: 'Permission denied. Only Superadmin can create folders in the root directory.' }, { status: 403 });
      }
    } else {
      // Check permissions for subfolders
      const hasAccess = await verifyFolderAccess(parentFolderId, session.user.email as string, session.user.role as string);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Permission denied for this folder' }, { status: 403 });
      }
    }

    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    };

    const token = await getDriveAccessToken();

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,thumbnailLink,webContentLink,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      throw new Error(createData.error?.message || 'Failed to create folder in Google Drive');
    }

    return NextResponse.json({ success: true, folder: createData });
  } catch (error: any) {
    console.error('Create Folder Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

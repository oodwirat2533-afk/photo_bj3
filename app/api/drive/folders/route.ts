import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import { getDriveAccessToken } from '@/lib/google-auth';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // get root folder ID
    const result = await sql`SELECT url FROM drive_urls ORDER BY created_at DESC LIMIT 1`;
    const row = result.rows.length > 0 ? result.rows[0] : null;
    let rootFolderId = null;
    if (row && row.url) {
      const match = row.url.match(/folders\/([a-zA-Z0-9-_]+)/);
      if (match) {
        rootFolderId = match[1];
      }
    }
    
    const token = await getDriveAccessToken();
    const q = `mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,parents)&pageSize=1000`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) {
        throw new Error('Failed to fetch from Drive API');
    }
    
    const data = await res.json();
    return NextResponse.json({ folders: data.files, rootFolderId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

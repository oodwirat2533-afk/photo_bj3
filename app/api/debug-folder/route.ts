import { NextResponse } from 'next/server';
import { getDriveAccessToken } from '@/lib/google-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('id');

    if (!folderId) {
      return NextResponse.json({ error: 'Missing id' });
    }

    const token = await getDriveAccessToken();
    
    // Get folder info
    const infoRes = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=name,parents,id&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    let info = {};
    if (infoRes.ok) {
      info = await infoRes.json();
    } else {
      info = { error: infoRes.status, statusText: infoRes.statusText, text: await infoRes.text() };
    }

    return NextResponse.json({ info });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

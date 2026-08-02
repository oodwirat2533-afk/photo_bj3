import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getDriveAccessToken } from '@/lib/google-auth';
import { verifyFolderAccess } from '@/lib/permissions';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, mimeType, size, folderId } = await request.json();

    if (!name || !folderId) {
      return NextResponse.json({ error: 'Missing name or folderId' }, { status: 400 });
    }

    const hasAccess = await verifyFolderAccess(folderId, session.user.email as string, session.user.role as string);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Permission denied for this folder' }, { status: 403 });
    }

    const metadata = {
      name: name,
      parents: [folderId],
    };

    const token = await getDriveAccessToken();

    // 1. Request a resumable upload URI from Google Drive API
    const origin = request.headers.get('origin') || '';
    
    const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,thumbnailLink,webContentLink,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': mimeType || 'application/octet-stream',
        ...(size ? { 'X-Upload-Content-Length': size.toString() } : {}),
        ...(origin ? { 'Origin': origin } : {})
      },
      body: JSON.stringify(metadata),
    });

    if (!initRes.ok) {
      const errorData = await initRes.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to initialize upload session');
    }

    // 2. The session URI is returned in the 'Location' header
    const uploadUrl = initRes.headers.get('Location');

    if (!uploadUrl) {
      throw new Error('Google Drive API did not return a resumable upload URL');
    }

    return NextResponse.json({ uploadUrl });
  } catch (error: any) {
    console.error('Init Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

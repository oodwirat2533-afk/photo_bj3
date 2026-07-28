import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getDriveAccessToken } from '@/lib/google-auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;

    if (!file || !folderId) {
      return NextResponse.json({ error: 'Missing file or folderId' }, { status: 400 });
    }

    const metadata = {
      name: file.name,
      parents: [folderId],
    };

    const googleFormData = new FormData();
    googleFormData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    googleFormData.append('file', file);

    const token = await getDriveAccessToken();

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,thumbnailLink,webContentLink,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: googleFormData,
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      throw new Error(uploadData.error?.message || 'Failed to upload to Google Drive');
    }

    return NextResponse.json({ success: true, file: uploadData });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

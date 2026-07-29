import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['superadmin', 'admin'].includes(session.user?.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id, name } = await req.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'Missing id or name' }, { status: 400 });
    }

    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: SCOPES,
    });

    const drive = google.drive({ version: 'v3', auth });

    await drive.files.update({
      fileId: id,
      requestBody: {
        name: name,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Drive Rename Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getDriveAccessToken } from '@/lib/google-auth';

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['superadmin', 'admin'].includes(session.user?.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'Missing id or name' }, { status: 400 });
    }

    const token = await getDriveAccessToken();

    const renameRes = await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });

    if (!renameRes.ok) {
      const data = await renameRes.json().catch(() => ({}));
      throw new Error(data.error?.message || 'Failed to rename file in Google Drive');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Rename Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

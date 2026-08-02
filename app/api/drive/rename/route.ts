import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getDriveAccessToken } from '@/lib/google-auth';
import { verifyFolderAccess } from '@/lib/permissions';

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user?.role === 'assistant_admin') {
      return NextResponse.json({ error: 'ผู้ช่วย Admin ไม่มีสิทธิ์เปลี่ยนชื่อ' }, { status: 403 });
    }

    const { id, name } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ error: 'Missing id or name' }, { status: 400 });
    }

    const token = await getDriveAccessToken();

    // Verify permission on parent folder
    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=parents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      const parentId = fileData.parents && fileData.parents.length > 0 ? fileData.parents[0] : null;
      if (parentId) {
        const hasAccess = await verifyFolderAccess(parentId, session.user.role as string);
        if (!hasAccess) {
          return NextResponse.json({ error: 'Permission denied to rename in this folder' }, { status: 403 });
        }
      }
    }

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

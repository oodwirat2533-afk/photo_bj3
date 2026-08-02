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

    if (session.user?.role === 'assistant_admin') {
      return NextResponse.json({ error: 'ผู้ช่วย Admin ไม่มีสิทธิ์ลบรูปภาพ' }, { status: 403 });
    }

    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }

    const token = await getDriveAccessToken();

    // Verify permission on parent folder
    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      const parentId = fileData.parents && fileData.parents.length > 0 ? fileData.parents[0] : null;
      if (parentId) {
        const hasAccess = await verifyFolderAccess(parentId, session.user.email, session.user.role);
        if (!hasAccess) {
          return NextResponse.json({ error: 'Permission denied to delete in this folder' }, { status: 403 });
        }
      }
    }

    const deleteRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!deleteRes.ok) {
      const data = await deleteRes.json().catch(() => ({}));
      throw new Error(data.error?.message || 'Failed to delete file from Google Drive');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

async function verifySuperadmin() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return false;
    }
    return session.user.role === 'superadmin';
  } catch (e) {
    console.error('Session verify error:', e);
    return false;
  }
}

// GET: Admin - Get all hidden folder IDs
export async function GET() {
  try {
    const result = await sql`
      SELECT folder_id FROM hidden_folders;
    `;
    const hiddenIds = result.rows.map(row => row.folder_id);
    return NextResponse.json({ hiddenIds });
  } catch (error) {
    console.error('Error fetching hidden folders:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลโฟลเดอร์ที่ซ่อนได้' }, { status: 500 });
  }
}

// POST: Superadmin - Toggle folder visibility
export async function POST(request: Request) {
  const isSuperadmin = await verifySuperadmin();
  if (!isSuperadmin) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง (ต้องเป็น Superadmin เท่านั้น)' }, { status: 403 });
  }

  try {
    const { folderId, hide } = await request.json();

    if (!folderId) {
      return NextResponse.json({ error: 'กรุณาระบุ folderId' }, { status: 400 });
    }

    if (hide) {
      await sql`
        INSERT INTO hidden_folders (folder_id)
        VALUES (${folderId})
        ON CONFLICT (folder_id) DO NOTHING;
      `;
    } else {
      await sql`
        DELETE FROM hidden_folders
        WHERE folder_id = ${folderId};
      `;
    }

    return NextResponse.json({ success: true, folderId, hidden: hide });
  } catch (error) {
    console.error('Error updating hidden folder:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะโฟลเดอร์' }, { status: 500 });
  }
}

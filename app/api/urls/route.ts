import { NextResponse } from 'next/server';
import { sql, DriveUrl } from '@/lib/db';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-change-in-production'
);

async function verifyAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token) return false;

    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

// GET: Public - List all drive URLs
export async function GET() {
  try {
    const result = await sql`
      SELECT id, title, url, description, created_at FROM drive_urls ORDER BY created_at DESC;
    `;
    return NextResponse.json(result.rows as DriveUrl[]);
  } catch (error) {
    console.error('Error fetching URLs:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลได้' }, { status: 500 });
  }
}

// POST: Admin only - Add new Drive URL
export async function POST(request: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  try {
    const { title, url, description } = await request.json();

    if (!title || !url) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อเรื่องและ URL' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO drive_urls (title, url, description)
      VALUES (${title}, ${url}, ${description || ''})
      RETURNING id, title, url, description, created_at;
    `;

    return NextResponse.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('Error adding URL:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล' }, { status: 500 });
  }
}

// DELETE: Admin only - Remove Drive URL by ID
export async function DELETE(request: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ไม่พบ ID ที่ต้องการลบ' }, { status: 400 });
    }

    await sql`
      DELETE FROM drive_urls WHERE id = ${id};
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting URL:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' }, { status: 500 });
  }
}

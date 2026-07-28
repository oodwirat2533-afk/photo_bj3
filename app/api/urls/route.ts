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

// GET: Public - Get the single drive URL
export async function GET() {
  try {
    const result = await sql`
      SELECT id, title, url, description, created_at FROM drive_urls ORDER BY created_at DESC LIMIT 1;
    `;
    return NextResponse.json(result.rows.length > 0 ? result.rows[0] : null);
  } catch (error) {
    console.error('Error fetching URLs:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลได้' }, { status: 500 });
  }
}

// POST: Admin only - Update the single Drive URL
export async function POST(request: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
  }

  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'กรุณาระบุ URL' }, { status: 400 });
    }

    // Clear old URLs and keep only the new one
    await sql`DELETE FROM drive_urls;`;
    
    const result = await sql`
      INSERT INTO drive_urls (title, url, description)
      VALUES ('Main Drive Folder', ${url}, '')
      RETURNING id, title, url, description, created_at;
    `;

    return NextResponse.json({ success: true, item: result.rows[0] });
  } catch (error) {
    console.error('Error updating URL:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' }, { status: 500 });
  }
}

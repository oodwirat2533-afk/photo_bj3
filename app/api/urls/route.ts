import { NextResponse } from 'next/server';
import { redis, DriveUrl } from '@/lib/redis';
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
    const urls = (await redis.get<DriveUrl[]>('drive_urls')) || [];
    return NextResponse.json(urls);
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

    const currentUrls = (await redis.get<DriveUrl[]>('drive_urls')) || [];

    const newMedia: DriveUrl = {
      id: Date.now().toString(),
      title,
      url,
      description: description || '',
      createdAt: new Date().toISOString(),
    };

    const updatedUrls = [newMedia, ...currentUrls];
    await redis.set('drive_urls', updatedUrls);

    return NextResponse.json({ success: true, item: newMedia });
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

    const currentUrls = (await redis.get<DriveUrl[]>('drive_urls')) || [];
    const updatedUrls = currentUrls.filter((item) => item.id !== id);

    await redis.set('drive_urls', updatedUrls);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting URL:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' }, { status: 500 });
  }
}

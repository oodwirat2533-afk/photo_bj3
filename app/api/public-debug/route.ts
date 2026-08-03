import { NextResponse } from 'next/server';
import { getDriveAccessToken } from '@/lib/google-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'no id' });

    const token = await getDriveAccessToken();
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=name,parents&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.ok) {
      return NextResponse.json(await res.json());
    } else {
      return NextResponse.json({ error: await res.text() });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}

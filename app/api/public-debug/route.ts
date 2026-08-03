import { NextResponse } from 'next/server';
import { getDriveAccessToken } from '@/lib/google-auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'no id' });

    const token = await getDriveAccessToken();
    const q = `'${id}' in parents and trashed=false`;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    let info: any = {};
    if (res.ok) {
      info = await res.json();
    } else {
      info = { error: await res.text() };
    }

    return NextResponse.json({ info });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}

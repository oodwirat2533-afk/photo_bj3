import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sql`
      SELECT folder_id, can_manage, include_subfolders 
      FROM folder_permissions 
    `;

    return NextResponse.json({ permissions: result.rows });
  } catch (error: any) {
    console.error('Fetch Permissions Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { permissions } = await request.json();
    if (!Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await sql`DELETE FROM folder_permissions`;

    for (const p of permissions) {
      await sql`
        INSERT INTO folder_permissions (folder_id, can_manage, include_subfolders)
        VALUES (${p.folder_id}, ${p.can_manage}, ${p.include_subfolders})
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Save Permissions Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

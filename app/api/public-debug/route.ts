import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const res = await sql`SELECT * FROM folder_permissions`;
    return NextResponse.json(res.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}

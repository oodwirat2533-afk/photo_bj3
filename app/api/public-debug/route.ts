import { NextResponse } from 'next/server';
import { verifyFolderAccess } from '@/lib/permissions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId') || '19F-SCYHWTsS7HfXGt0AMyvVfA69tBelN';
  const role = searchParams.get('role') || 'admin';
  const hasAccess = await verifyFolderAccess(folderId, role);
  return NextResponse.json({ folderId, role, hasAccess });
}

import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import { verifyFolderAccess } from '@/lib/permissions';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ hasAccess: false });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json({ hasAccess: false });
    }

    const hasAccess = await verifyFolderAccess(folderId, session.user.email, session.user.role);
    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error('Check Permissions Error:', error);
    return NextResponse.json({ hasAccess: false });
  }
}

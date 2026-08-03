import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../api/auth/[...nextauth]/route";
import { verifyFolderAccess } from '@/lib/permissions';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('[DEBUG] API /permissions/check - session:', JSON.stringify(session));
    
    if (!session || !session.user?.isAdmin) {
      console.log('[DEBUG] API /permissions/check - no valid session/admin');
      return NextResponse.json({ hasAccess: false });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    console.log('[DEBUG] API /permissions/check - folderId:', folderId);

    if (!folderId) {
      return NextResponse.json({ hasAccess: false });
    }

    const hasAccess = await verifyFolderAccess(folderId, session.user.role as string);
    console.log('[DEBUG] API /permissions/check - hasAccess:', hasAccess, 'for userRole:', session.user.role);
    return NextResponse.json({ hasAccess });
  } catch (error) {
    console.error('Check Permissions Error:', error);
    return NextResponse.json({ hasAccess: false });
  }
}

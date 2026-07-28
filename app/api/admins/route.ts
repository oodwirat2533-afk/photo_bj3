import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

async function verifyAdmin() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) return false;
    
    // Check if master admin
    const masterAdmins = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());
    if (masterAdmins.includes(session.user.email.toLowerCase())) return true;
    
    // Check in DB
    const result = await sql`SELECT email FROM admin_emails WHERE email = ${session.user.email.toLowerCase()}`;
    return result.rows.length > 0;
  } catch (e) {
    console.error('Session verify error:', e);
    return false;
  }
}

// GET: List all admins
export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const result = await sql`SELECT email, created_at FROM admin_emails ORDER BY created_at DESC`;
    const dbAdmins = result.rows.map(row => row.email);
    const masterAdmins = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase()).filter(e => e);
    
    // Combine master and db admins uniquely
    const allAdmins = Array.from(new Set([...masterAdmins, ...dbAdmins]));
    return NextResponse.json({ admins: allAdmins, masterAdmins });
  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
  }
}

// POST: Add a new admin
export async function POST(request: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Check if already in DB
    const check = await sql`SELECT email FROM admin_emails WHERE email = ${cleanEmail}`;
    if (check.rows.length > 0) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    await sql`INSERT INTO admin_emails (email) VALUES (${cleanEmail})`;
    return NextResponse.json({ success: true, email: cleanEmail });
  } catch (error) {
    console.error('Error adding admin:', error);
    return NextResponse.json({ error: 'Failed to add admin' }, { status: 500 });
  }
}

// DELETE: Remove an admin
export async function DELETE(request: Request) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

    const cleanEmail = email.trim().toLowerCase();
    
    // Prevent deleting master admin
    const masterAdmins = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());
    if (masterAdmins.includes(cleanEmail)) {
      return NextResponse.json({ error: 'Cannot delete master admin' }, { status: 400 });
    }

    await sql`DELETE FROM admin_emails WHERE email = ${cleanEmail}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting admin:', error);
    return NextResponse.json({ error: 'Failed to delete admin' }, { status: 500 });
  }
}

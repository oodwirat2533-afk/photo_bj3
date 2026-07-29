import { NextResponse } from 'next-auth/next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { sql } from '@/lib/db';

// Superadmin only: Get all users
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'superadmin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await sql`
      SELECT email, role, title, first_name, last_name, subject_group, is_onboarded, created_at 
      FROM users 
      ORDER BY created_at DESC
    `;

    return new Response(JSON.stringify({ users: result.rows }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Superadmin only: Add new user
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'superadmin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { email, role } = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ error: 'Missing email or role' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanEmail = email.toLowerCase();
    
    // Check if user already exists
    const check = await sql`SELECT email FROM users WHERE email = ${cleanEmail}`;
    if (check.rows.length > 0) {
      return new Response(JSON.stringify({ error: 'อีเมลนี้มีอยู่ในระบบแล้ว' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Insert user
    await sql`
      INSERT INTO users (email, role, is_onboarded)
      VALUES (${cleanEmail}, ${role}, FALSE)
    `;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Add user error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

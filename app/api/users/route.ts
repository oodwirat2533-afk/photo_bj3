import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { sql } from '@/lib/db';

const MASTER_EMAIL = 'ood.wirat2533@gmail.com';

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

    const dbUsers = result.rows;
    return new Response(JSON.stringify({ users: dbUsers }), {
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
    
    // Only MASTER_EMAIL can assign superadmin role
    if (role === 'superadmin' && session.user?.email !== MASTER_EMAIL) {
      return new Response(JSON.stringify({ error: 'Only the master admin can assign the superadmin role.' }), {
        status: 403,
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

// Superadmin only: Edit user role
export async function PUT(req: Request) {
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
    
    // Only MASTER_EMAIL can assign superadmin role
    if (role === 'superadmin' && session.user?.email !== MASTER_EMAIL) {
      return new Response(JSON.stringify({ error: 'Only the master admin can assign the superadmin role.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanEmail = email.toLowerCase();
    
    // Prevent modifying the master admin
    if (cleanEmail === MASTER_EMAIL) {
      return new Response(JSON.stringify({ error: 'Cannot modify master admin role' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update user role
    await sql`
      UPDATE users SET role = ${role} WHERE email = ${cleanEmail}
    `;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Edit user error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Superadmin only: Delete user
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'superadmin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Missing email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    
    if (cleanEmail === MASTER_EMAIL) {
      return new Response(JSON.stringify({ error: 'Cannot delete master admin' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await sql`DELETE FROM users WHERE email = ${cleanEmail}`;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

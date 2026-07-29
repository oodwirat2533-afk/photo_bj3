import { NextResponse } from 'next-auth/next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { sql } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const email = session.user.email.toLowerCase();
    const { title, firstName, lastName, subjectGroup } = await req.json();

    if (!title || !firstName || !lastName || !subjectGroup) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update user in database
    await sql`
      UPDATE users
      SET 
        title = ${title},
        first_name = ${firstName},
        last_name = ${lastName},
        subject_group = ${subjectGroup},
        is_onboarded = TRUE
      WHERE email = ${email}
    `;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Onboard error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

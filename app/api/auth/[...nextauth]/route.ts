import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { sql } from '@/lib/db';

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin?: boolean;
    };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/admin',
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && session.user.email) {
        const cleanEmail = session.user.email.toLowerCase();
        const masterAdmins = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());
        
        let isAdmin = masterAdmins.includes(cleanEmail);
        
        // If not master admin, check DB
        if (!isAdmin) {
          try {
            const dbCheck = await sql`SELECT email FROM admin_emails WHERE email = ${cleanEmail}`;
            if (dbCheck.rows.length > 0) isAdmin = true;
          } catch (e) {
            console.error('DB Admin check error:', e);
          }
        }
        
        session.user.isAdmin = isAdmin;
      }
      session.accessToken = token.accessToken as string;
      return session;
    }
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

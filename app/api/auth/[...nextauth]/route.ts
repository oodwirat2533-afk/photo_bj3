import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { sql } from '@/lib/db';

declare module "next-auth" {
  interface Session {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin?: boolean;
      role?: string;
      isOnboarded?: boolean;
    };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/admin',
  },
  callbacks: {
    async jwt({ token, user, account, profile, isNewUser }) {
      if (token.email) {
        const cleanEmail = token.email.toLowerCase();
        const masterAdmins = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());
        
        let isMasterAdmin = masterAdmins.includes(cleanEmail);
        
        if (isMasterAdmin) {
          token.isAdmin = true;
          token.role = 'superadmin';
          token.isOnboarded = true; 
        } else {
          token.isAdmin = false;
        }
        
        try {
          const dbCheck = await sql`SELECT role, is_onboarded FROM users WHERE email = ${cleanEmail}`;
          if (dbCheck.rows.length > 0) {
            const dbUser = dbCheck.rows[0];
            token.isAdmin = true;
            token.role = dbUser.role; // 'admin' or 'assistant_admin'
            token.isOnboarded = dbUser.is_onboarded;
          }
        } catch (e) {
          console.error('DB Admin check error:', e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.role = token.role as string;
        session.user.isOnboarded = token.isOnboarded as boolean;
      }
      return session;
    }
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

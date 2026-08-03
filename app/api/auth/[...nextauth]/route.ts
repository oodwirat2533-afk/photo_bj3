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
    signIn: '/',
  },
  callbacks: {
    async signIn({ user }) {
      if (user.email) {
        const cleanEmail = user.email.toLowerCase();
        const masterAdmins = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase());
        
        if (masterAdmins.includes(cleanEmail)) {
          return true;
        }

        try {
          const dbCheck = await sql`SELECT email FROM users WHERE email = ${cleanEmail}`;
          if (dbCheck.rows.length > 0) {
            return true;
          }
        } catch (e) {
          console.error('Sign In DB Check Error:', e);
        }
      }
      return '/?error=unauthorized';
    },
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
          const dbCheck = await sql`SELECT role, is_onboarded, title, first_name, last_name FROM users WHERE email = ${cleanEmail}`;
          if (dbCheck.rows.length > 0) {
            const dbUser = dbCheck.rows[0];
            token.isAdmin = true;
            if (!isMasterAdmin) {
              token.role = dbUser.role;
            }
            token.isOnboarded = dbUser.is_onboarded;
            
            if (dbUser.first_name) {
              token.name = `${dbUser.title || ''}${dbUser.first_name} ${dbUser.last_name || ''}`.trim();
            }
          }
        } catch (e) {
          console.error('DB Admin check error:', e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.name) {
          session.user.name = token.name;
        }
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

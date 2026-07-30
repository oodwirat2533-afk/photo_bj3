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
    error: '/',
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const cleanEmail = user.email.toLowerCase();
      
      if (cleanEmail === 'ood.wirat2533@gmail.com') return true;
      
      try {
        const dbCheck = await sql`SELECT email FROM users WHERE email = ${cleanEmail}`;
        if (dbCheck.rows.length > 0) {
          return true; // allow sign in
        }
        return false; // block sign in for non-admins
      } catch (e) {
        console.error('SignIn check error:', e);
        return false;
      }
    },
    async jwt({ token, user, account, profile, isNewUser }) {
      if (token.email) {
        const cleanEmail = token.email.toLowerCase();
        
        token.isAdmin = false;
        token.role = 'user';
        token.isOnboarded = false;
        
        try {
          const dbCheck = await sql`SELECT role, is_onboarded, title, first_name, last_name FROM users WHERE email = ${cleanEmail}`;
          if (dbCheck.rows.length > 0) {
            const dbUser = dbCheck.rows[0];
            token.isAdmin = true;
            token.role = dbUser.role; // 'admin' or 'assistant_admin'
            token.isOnboarded = dbUser.is_onboarded;
            
            if (dbUser.first_name) {
              const fullName = `${dbUser.title || ''}${dbUser.first_name} ${dbUser.last_name || ''}`.trim();
              token.name = fullName;
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
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.role = token.role as string;
        session.user.isOnboarded = token.isOnboarded as boolean;
        if (token.name) {
          session.user.name = token.name as string;
        }
      }
      return session;
    }
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

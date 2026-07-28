import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
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
      // Persist the OAuth access_token right after signin
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token from a provider.
      if (session.user) {
        session.user.isAdmin = session.user.email === process.env.ADMIN_EMAIL;
      }
      session.accessToken = token.accessToken as string;
      return session;
    }
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

import { withAuth } from "next-auth/middleware";
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    
    // Paths
    const pathname = req.nextUrl.pathname;
    const isOnboardingPage = pathname.startsWith('/onboarding');
    
    // If logged in, check role and onboarding
    if (isAuth && token) {
      const isOnboarded = token.isOnboarded;
      const isOnboardingPage = req.nextUrl.pathname.startsWith('/onboarding');
  
      // Protect onboarding page: only for un-onboarded admins
      if (isOnboardingPage) {
        if (!token?.isAdmin) {
          return NextResponse.redirect(new URL('/', req.url));
        }
        if (token?.isOnboarded) {
          return NextResponse.redirect(new URL('/', req.url));
        }
        return NextResponse.next();
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/onboarding']
};

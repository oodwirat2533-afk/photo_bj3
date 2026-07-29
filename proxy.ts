import { withAuth } from "next-auth/middleware";
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    
    // Paths
    const pathname = req.nextUrl.pathname;
    const isAdminDashboard = pathname === '/admin' || pathname.startsWith('/admin/');
    const isOnboardingPage = pathname.startsWith('/onboarding');
    
    // If logged in, check role and onboarding
    if (isAuth && token) {
      const isOnboarded = token.isOnboarded;
      const isAdmin = token.isAdmin;

      // 2. If not onboarded and trying to access admin dashboard, redirect to onboarding
      if (isAdminDashboard && !isOnboarded) {
        return NextResponse.redirect(new URL('/onboarding', req.url));
      }

      // 3. If onboarded and trying to access onboarding, redirect to dashboard
      if (isOnboardingPage && isOnboarded) {
        return NextResponse.redirect(new URL('/admin', req.url));
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
  matcher: ['/admin', '/admin/:path*', '/onboarding/:path*']
};

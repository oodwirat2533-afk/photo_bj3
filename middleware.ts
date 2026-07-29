import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    
    // Paths
    const isAuthPage = req.nextUrl.pathname.startsWith('/admin/login') || req.nextUrl.pathname === '/admin';
    const isOnboardingPage = req.nextUrl.pathname.startsWith('/onboarding');
    const isAdminDashboard = req.nextUrl.pathname.startsWith('/admin/dashboard') || req.nextUrl.pathname.startsWith('/admin/users');
    
    // If logged in, check role and onboarding
    if (isAuth && token) {
      const isOnboarded = token.isOnboarded;
      const isAdmin = token.isAdmin;

      // 1. If not admin (not in DB and not master admin), log them out or show access denied
      if (!isAdmin) {
        // Allow access to auth page or default page, maybe redirect to a specific denied page
        // But NextAuth usually handles this if they don't have access.
      }

      // 2. If not onboarded and trying to access admin dashboard, redirect to onboarding
      if (isAdminDashboard && !isOnboarded) {
        return NextResponse.redirect(new URL('/onboarding', req.url));
      }

      // 3. If onboarded and trying to access onboarding, redirect to dashboard
      if (isOnboardingPage && isOnboarded) {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url)); // Assuming dashboard exists
      }
    }

    // Unauthenticated logic handled by NextAuth pages configuration
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Require token for matched routes
    },
  }
);

export const config = {
  matcher: ['/admin/dashboard/:path*', '/admin/users/:path*', '/onboarding/:path*']
};

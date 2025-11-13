import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // Redirect to login if not authenticated and trying to access a protected route
    if (!token && pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/api/auth/signin', req.url));
    }
    
    // Check for role on admin pages
    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN' && token?.role !== 'MODERATOR') {
      // You could redirect to an "access denied" page or the home page
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Specifies the paths that the middleware should apply to
export const config = {
  matcher: ['/admin/:path*'],
};

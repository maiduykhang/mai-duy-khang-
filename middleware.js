// middleware.js
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect admin routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', session.user.id)
      .single();

    if (!profile || profile.user_type !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // Protect employer routes
  if (req.nextUrl.pathname.startsWith('/employer')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('user_type, is_banned')
      .eq('id', session.user.id)
      .single();

    if (!profile || (profile.user_type !== 'employer' && profile.user_type !== 'admin')) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    if (profile.is_banned) {
      // In a real app, you'd redirect to a dedicated /banned page.
      const url = new URL('/?error=banned', req.url);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/employer/:path*'],
};

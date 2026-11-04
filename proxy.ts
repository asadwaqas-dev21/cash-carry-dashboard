import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasSupabase, supabaseKey, supabaseUrl } from './lib/supabase-env';

// Pages reachable without a session.
const PUBLIC_PATHS = ['/login', '/auth/'];

/**
 * Refreshes the Supabase session cookie on every request and sends signed-out
 * visitors to /login. This is only an optimistic check; pages and actions
 * verify the user and role again through lib/auth.ts.
 */
export async function proxy(request: NextRequest) {
  if (!hasSupabase) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => (p.endsWith('/') ? path.startsWith(p) : path === p));

  const redirectTo = (target: URL) => {
    const redirect = NextResponse.redirect(target);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!signedIn && !isPublic) {
    const login = new URL('/login', request.url);
    if (path !== '/') login.searchParams.set('next', path + request.nextUrl.search);
    return redirectTo(login);
  }
  if (signedIn && path === '/login') {
    return redirectTo(new URL('/', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};

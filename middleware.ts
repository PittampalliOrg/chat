import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { guestRegex, isDevelopmentEnvironment } from './lib/constants';
import { trace } from '@opentelemetry/api';
import { after } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
    * Playwright starts the dev server and requires a 200 status to
    * begin the tests, so this ensures that the tests can start
    */
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  /*
    * Bypass authentication checks for MCP connections
    */
  if (pathname.startsWith('/mcp')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Skip auth for health checks
  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (!token) {
    // Construct the correct redirect URL using headers
    const host = request.headers.get('x-forwarded-host') ||
                  request.headers.get('host') ||
                  request.nextUrl.host;
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const originalUrl = `${proto}://${host}${pathname}${request.nextUrl.search}`;
    const redirectUrl = encodeURIComponent(originalUrl);

    return NextResponse.redirect(
      new URL(`/api/auth/guest?redirectUrl=${redirectUrl}`, `${proto}://${host}`),
    );
  }

  const isGuest = guestRegex.test(token?.email ?? '');

  if (token && !isGuest && ['/login', '/register'].includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const tracer      = trace.getTracer('nextjs-middleware');
  const activeSpan  = trace.getActiveSpan();
  const span        = activeSpan ?? tracer.startSpan(`middleware ${pathname}`);
  const created     = activeSpan === undefined;

  const res = NextResponse.next();
  res.headers.set(
    'server-timing',
    `traceparent;desc="00-${span.spanContext().traceId}-${span.spanContext().spanId}-01"`
  );

  if (created) {
    after(() => span.end());
  }
  return res;
}

export const config = {
  matcher: [
    '/',
    '/chat/:id',
    '/api/:path*',
    '/login',
    '/register',

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
      '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/health).*)',
  ],
};

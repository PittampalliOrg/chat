// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { guestRegex } from '@/lib/constants'; // Assuming isDevelopmentEnvironment is no longer needed here
import { trace } from '@opentelemetry/api';

export async function middleware(request: NextRequest) {
  const { pathname, search, origin: requestOrigin } = request.nextUrl; // Use requestOrigin for clarity

  console.log(`--- [Middleware Request Start] ---`);
  console.log(`[Middleware] Pathname: ${pathname}`);
  console.log(`[Middleware] Full original request.url (as seen by middleware): ${request.url}`);
  console.log(`[Middleware] request.nextUrl.origin: ${requestOrigin}`);
  console.log(`[Middleware] request.nextUrl.href: ${request.nextUrl.href}`);
  console.log(`[Middleware] Headers - host: ${request.headers.get('host')}`);
  console.log(`[Middleware] Headers - x-forwarded-host: ${request.headers.get('x-forwarded-host')}`);
  console.log(`[Middleware] Headers - x-forwarded-proto: ${request.headers.get('x-forwarded-proto')}`);
  console.log(`[Middleware] Env NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`);

  if (pathname.startsWith('/ping')) {
    console.log('[Middleware] Responding to /ping');
    return new Response('pong', { status: 200 });
  }

  // Allow all /api/auth/* routes to pass through the middleware without token checks first
  if (pathname.startsWith('/api/auth/')) {
    console.log('[Middleware] Passing through /api/auth/* request.');
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    // For Kind/localhost development, especially over HTTP, secureCookie often needs to be false
    // or explicitly handled based on NEXTAUTH_URL protocol.
    secureCookie: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false, // Default to false if NEXTAUTH_URL is undefined
  });
  console.log('[Middleware] Token:', token ? `Exists (email: ${token.email})` : 'null');

  if (!token) {
    let publicBaseUrl = process.env.NEXTAUTH_URL;
    if (!publicBaseUrl) {
        const forwardedHost = request.headers.get('x-forwarded-host');
        const forwardedProto = request.headers.get('x-forwarded-proto');
        if (process.env.TRUST_PROXY === '1' && forwardedHost && forwardedProto) {
            publicBaseUrl = `${forwardedProto}://${forwardedHost}`;
        } else {
            publicBaseUrl = requestOrigin; // Fallback to origin derived from the request
        }
    }
    
    const intendedUserDestinationUrl = new URL(`${pathname}${search}`, publicBaseUrl).toString();
    console.log('[Middleware] No token. Calculated intendedUserDestinationUrl for redirect param:', intendedUserDestinationUrl);
    
    const redirectParam = encodeURIComponent(intendedUserDestinationUrl);
    
    const guestAuthServiceUrl = new URL(`/api/auth/guest?redirectUrl=${redirectParam}`, publicBaseUrl).toString();
    
    console.log('[Middleware] Redirecting to guest auth service URL:', guestAuthServiceUrl);
    return NextResponse.redirect(guestAuthServiceUrl);
  }

  const isGuest = guestRegex.test(token?.email ?? '');
  if (!isGuest && (pathname === '/login' || pathname === '/register')) {
    console.log('[Middleware] Authenticated non-guest on login/register page. Redirecting to /');
    const homeUrl = new URL('/', process.env.NEXTAUTH_URL || requestOrigin);
    return NextResponse.redirect(homeUrl);
  }
  
  console.log('[Middleware] Passing through: User has token or path does not require auth.');
  console.log(`--- [Middleware Request End] ---`);

  const response = NextResponse.next();
  
  // Get the active span for telemetry
  const current = trace.getActiveSpan();

  // Set server-timing header with traceparent if a span exists
  if (current) {
    response.headers.set(
      'server-timing',
      `traceparent;desc="00-${current.spanContext().traceId}-${current.spanContext().spanId}-01"`
    );
  }
  
  return response;


}

export const config = {
  matcher: [
    '/',
    '/chat/:id*',
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/auth/).*)',
    '/login',
    '/register',
  ],
};
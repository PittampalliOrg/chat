// app/(auth)/api/auth/guest/route.ts
import { signIn } from '@/app/(auth)/auth';
import { isDevelopmentEnvironment } from '@/lib/constants';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  console.log(`--- [/api/auth/guest GET Start] ---`);
  const { searchParams, href } = new URL(request.url);
  const redirectUrlFromQuery = searchParams.get('redirectUrl') || '/';

  console.log(`[/api/auth/guest] Full request URL: ${href}`);
  console.log(`[/api/auth/guest] Received redirectUrlFromQuery param: ${redirectUrlFromQuery}`);
  console.log(`[/api/auth/guest] Env NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`);

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  console.log('[/api/auth/guest] Token check before signIn:', token ? 'Exists' : 'null');


  if (token) { // Should normally be null when this route is hit for guest login
    const resolvedRedirectBase = process.env.NEXTAUTH_URL || request.url;
    const finalRedirect = new URL(redirectUrlFromQuery, resolvedRedirectBase); // Try to resolve against a proper base
    console.log(`[/api/auth/guest] Token exists. Redirecting to (resolved from query): ${finalRedirect.toString()}`);
    console.log(`--- [/api/auth/guest GET End (Token Exists)] ---`);
    return NextResponse.redirect(finalRedirect);
  }

  try {
    console.log(`[/api/auth/guest] Attempting signIn('guest') which will redirect to: ${redirectUrlFromQuery}`);
    // The signIn function itself will handle the actual redirect if successful
    const signInResponse = await signIn('guest', { redirect: true, redirectTo: redirectUrlFromQuery });
    console.log(`[/api/auth/guest] signIn('guest') call completed. It should have issued a redirect.`);
    console.log(`--- [/api/auth/guest GET End (After signIn)] ---`);
    return signInResponse; // This will be the redirect response from NextAuth
  } catch (error) {
    console.error('[/api/auth/guest] Error during signIn("guest"):', error);
    console.log(`--- [/api/auth/guest GET End (Error)] ---`);
    return new Response('Authentication error', { status: 500 });
  }
}
import { signIn } from '@/app/(auth)/auth';
import { isDevelopmentEnvironment } from '@/lib/constants';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get('redirectUrl') || '/';
  
  // Get the base URL from environment variable
  const baseUrl = process.env.NEXTAUTH_URL;
  
  if (!baseUrl) {
    console.error('NEXTAUTH_URL environment variable is not set');
    throw new Error('NEXTAUTH_URL environment variable is not set');
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (token) {
    // Use absolute URL with the NEXTAUTH_URL as base
    return NextResponse.redirect(new URL('/', baseUrl));
  }

  // For the signIn function, we'll use the absolute redirectTo path
  const absoluteRedirectUrl = redirectUrl.startsWith('/')
    ? `${baseUrl}${redirectUrl}`
    : redirectUrl;
    
  return signIn('guest', { redirect: true, redirectTo: absoluteRedirectUrl });
}
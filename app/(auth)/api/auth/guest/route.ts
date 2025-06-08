import { signIn, auth } from '@/app/(auth)/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get('redirectUrl') || '/';

  const session = await auth();

  if (session?.user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return signIn('guest', { redirect: true, redirectTo: redirectUrl });
}

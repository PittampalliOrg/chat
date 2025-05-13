// app/(auth)/auth.ts
// This is the version from the previous successful fix for this file.
// Ensure your MyAppDbUser and MyAppDbGuestUser interfaces accurately reflect your DB query returns.

import { compare } from 'bcrypt-ts';
import NextAuth, { type DefaultSession, type User as NextAuthUser, type Session as NextAuthSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import {
  createGuestUser,
  getUser,
} from '@/lib/db/queries';
import { authConfig } from './auth.config';
import { DUMMY_PASSWORD } from '@/lib/constants';

export type UserType = 'guest' | 'regular';

interface MyAppDbUser {
  id: string;
  email: string | null; 
  password?: string | null;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null; 
}

interface MyAppDbGuestUser {
  id: string;
  email: string; 
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
}

declare module 'next-auth' {
  interface User {
    id?: string; 
    type?: UserType;
    name?: string | null;
    email?: string | null | undefined; 
    image?: string | null;
    emailVerified?: Date | null;
  }

  interface Session {
    user?: { 
      id: string; 
      type: UserType;
      name: string | null;
      email: string; 
      image?: string | null;
      emailVerified: Date | null; 
    };
    expires: DefaultSession['expires'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string; 
    type?: UserType;
    name?: string | null;
    email?: string | null | undefined; 
    picture?: string | null; 
    emailVerified?: Date | null;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  debug: true,
  trustHost: true,
  ...authConfig,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {},
      async authorize(credentials: any): Promise<NextAuthUser | null> {
        const { email, password } = credentials;
        if (!email || !password) return null;

        const usersFromDb = await getUser(email as string) as MyAppDbUser[];
        if (usersFromDb.length === 0) {
          await compare(password as string, DUMMY_PASSWORD);
          return null;
        }
        const userFromDb = usersFromDb[0];

        if (!userFromDb.password) {
          await compare(password as string, DUMMY_PASSWORD);
          return null;
        }
        const passwordsMatch = await compare(password as string, userFromDb.password);
        if (!passwordsMatch) return null;
        
        if (!userFromDb.id ) {
            console.error("DB user missing critical id", userFromDb);
            return null; 
        }

        return {
          id: userFromDb.id,
          email: userFromDb.email, 
          name: userFromDb.name ?? null,
          image: userFromDb.image ?? null,
          type: 'regular',
          emailVerified: userFromDb.emailVerified ?? null,
        };
      },
    }),
    Credentials({
      id: 'guest',
      credentials: {},
      async authorize(): Promise<NextAuthUser | null> {
        try {
          const [guestUserFromDb] = await createGuestUser() as MyAppDbGuestUser[];
          if (!guestUserFromDb || !guestUserFromDb.id || !guestUserFromDb.email) {
            console.error("Guest user creation failed to return required fields", guestUserFromDb);
            return null;
          }
          return {
            id: guestUserFromDb.id,
            email: guestUserFromDb.email, 
            name: guestUserFromDb.name ?? `Guest`,
            image: guestUserFromDb.image ?? null,
            type: 'guest',
            emailVerified: guestUserFromDb.emailVerified ?? null,
          };
        } catch (error) {
          console.error('Error in guest authorize:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) { 
      if (user) {
        token.id = user.id; 
        token.type = user.type; 
        token.name = user.name; 
        token.email = user.email; 
        token.picture = user.image;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      let sessionUserObject: NextAuthSession['user'] = undefined; 

      if (token.id && typeof token.email === 'string' && token.type) {
        sessionUserObject = {
          id: token.id,
          type: token.type,
          name: token.name ?? null,
          email: token.email,
          image: token.picture ?? null,
          emailVerified: (token.emailVerified instanceof Date || token.emailVerified === null) 
                           ? token.emailVerified 
                           : null,
        };
      } else {
        console.warn(
          '[Auth Session Callback] Token missing critical id, string email, or type. User object for session will be undefined.',
          { tokenId: token.id, tokenEmail: token.email, tokenType: token.type }
        );
      }
      
      return {
        user: sessionUserObject, 
        expires: session.expires, 
      };
    },
  },
});
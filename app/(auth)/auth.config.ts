import type { NextAuthConfig } from "next-auth"

// Get the base URL from environment variable
const getBaseUrl = () => {
  const baseUrl = process.env.NEXTAUTH_URL
  if (!baseUrl) {
    console.error("NEXTAUTH_URL environment variable is not set")
    throw new Error("NEXTAUTH_URL environment variable is not set")
  }
  return baseUrl
}

export const authConfig = {
  pages: {
    // Use absolute paths for auth pages
    signIn: `${process.env.NEXTAUTH_URL}/login`,
    newUser: `${process.env.NEXTAUTH_URL}/`,
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {},
} satisfies NextAuthConfig

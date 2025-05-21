import { NextResponse } from "next/server"

export async function GET() {
  // Filter client-side environment variables (NEXT_PUBLIC_*)
  const clientEnvVars: Record<string, string> = {}
  const serverEnvVars: Record<string, string> = {}

  // Process all environment variables
  Object.keys(process.env).forEach((key) => {
    // Skip internal Next.js variables and sensitive variables
    const isSensitive =
      key.includes("SECRET") ||
      key.includes("PASSWORD") ||
      key.includes("TOKEN") ||
      (key.includes("KEY") && (key.includes("API") || key.includes("ACCESS")))

    if (key.startsWith("NEXT_INTERNAL_") || isSensitive) {
      return
    }

    // Separate client and server variables
    if (key.startsWith("NEXT_PUBLIC_")) {
      clientEnvVars[key] = process.env[key] || ""
    } else {
      // Include all non-sensitive server variables
      serverEnvVars[key] = process.env[key] || ""
    }
  })

  return NextResponse.json({
    client: clientEnvVars,
    server: serverEnvVars,
  })
}

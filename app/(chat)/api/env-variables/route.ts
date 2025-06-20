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

    // Skip npm_package_* variables as they clutter the display
    if (key.startsWith("npm_package_")) {
      return
    }

    // if (key.startsWith("NEXT_INTERNAL_") || isSensitive) {
    //   return
    // }

    // Separate client and server variables
    if (key.startsWith("NEXT_PUBLIC_")) {
      clientEnvVars[key] = process.env[key] || ""
    } else {
      // Include all non-sensitive server variables
      serverEnvVars[key] = process.env[key] || ""
    }
  })

  // Sort the variables alphabetically by key
  const sortedClientEnvVars = Object.keys(clientEnvVars)
    .sort()
    .reduce((acc, key) => {
      acc[key] = clientEnvVars[key]
      return acc
    }, {} as Record<string, string>)

  const sortedServerEnvVars = Object.keys(serverEnvVars)
    .sort()
    .reduce((acc, key) => {
      acc[key] = serverEnvVars[key]
      return acc
    }, {} as Record<string, string>)

  return NextResponse.json({
    client: sortedClientEnvVars,
    server: sortedServerEnvVars,
  })
}

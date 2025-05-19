/**
 * Utility functions for handling URLs in a self-hosted environment
 */

/**
 * Gets the base URL from the NEXTAUTH_URL environment variable
 * For server components and API routes
 */
export const getBaseUrl = () => {
  const baseUrl = process.env.NEXTAUTH_URL
  if (!baseUrl) {
    console.error("NEXTAUTH_URL environment variable is not set")
    throw new Error("NEXTAUTH_URL environment variable is not set")
  }
  return baseUrl
}

/**
 * Gets the base URL from the NEXT_PUBLIC_NEXTAUTH_URL environment variable
 * For client components
 */
export const getClientBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_NEXTAUTH_URL
  return baseUrl || ""
}

/**
 * Creates an absolute URL from a relative path
 * @param path - The relative path (e.g., '/login')
 * @param isClient - Whether this is being called from a client component
 * @returns The absolute URL
 */
export const createAbsoluteUrl = (path: string, isClient = false) => {
  const baseUrl = isClient ? getClientBaseUrl() : getBaseUrl()
  // Ensure path starts with a slash
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

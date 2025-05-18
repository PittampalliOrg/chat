export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node')
  }
}
export function registerClient() {
  // Only enable client-side OpenTelemetry in production
  if (process.env.NEXT_RUNTIME === 'nodejs' && typeof window !== "undefined") {
    import("./instrumentation.client").then(({ register }) => register())
  }
}

export function onRequestError(err: Error) {
  // Optional: Add error handling logic here
  console.error("Request error:", err)
}

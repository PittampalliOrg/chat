export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation.node')
  }
}

export async function registerClient() {
  if (typeof window !== 'undefined') {
    const { register } = await import('./instrumentation.client')
    register()
  }
}
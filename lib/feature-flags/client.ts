/**
 * Client-safe feature flag exports
 * This file only exports definitions that can be safely imported in client components
 */

// Re-export only the flag definitions, not server-side utilities
export * from './flags';
export * from './examples';

// Note: Do NOT export 'identify' or 'adapter' here as they use server-only APIs
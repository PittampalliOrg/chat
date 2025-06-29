/**
 * Client-safe feature flag exports
 * This file only exports definitions that can be safely imported in client components
 */

// Temporarily export only examples until we implement proper OpenFeature-based flags
export * from './examples';

// Note: Do NOT export 'identify' or 'adapter' here as they use server-only APIs
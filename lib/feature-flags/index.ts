/**
 * Feature Flags module entry point
 * Export all feature flags and utilities for easy import
 */

// Temporarily comment out problematic exports
// export * from './flags';
export * from './adapter';
export * from './examples';
// export { identify } from './identify';

/**
 * Initialize feature flags on application startup
 * This should be called in your app's instrumentation.ts or layout.tsx
 * 
 * Example in instrumentation.ts:
 * ```typescript
 * import { initializeFeatureFlags } from '@/lib/feature-flags';
 * 
 * export async function register() {
 *   await initializeFeatureFlags();
 * }
 * ```
 * 
 * Or in app/layout.tsx:
 * ```typescript
 * import { initializeFeatureFlags } from '@/lib/feature-flags';
 * 
 * // Call this before rendering
 * await initializeFeatureFlags();
 * ```
 */
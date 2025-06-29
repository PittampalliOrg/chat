import { OpenFeature, ServerProviderEvents } from "@openfeature/server-sdk";
import { FlagdProvider } from '@openfeature/flagd-provider';

/**
 * Initialize the flagd provider for OpenFeature
 * The flagd sidecar runs on localhost:8013 by default
 */
export async function initializeFlagdProvider() {
  // Configure the flagd provider to connect to the sidecar
  const provider = new FlagdProvider({
    // Connect to flagd sidecar on default RPC port
    host: process.env.FLAGD_HOST || 'localhost',
    port: Number.parseInt(process.env.FLAGD_PORT || '8013'),
    
    // Disable caching to ensure server-side flags are always fresh
    // This ensures updates in flagd UI are immediately reflected
    cache: 'disabled',
    
    // Note: deadline is not a valid option for FlagdProvider
    // Timeout is handled at the gRPC level
  });
  
  // Set the provider and wait for it to be ready
  await OpenFeature.setProviderAndWait(provider);
  
  // Get a client instance
  const client = OpenFeature.getClient();
  
  // Optional: Add event handlers for monitoring using proper event types
  client.addHandler(ServerProviderEvents.Ready, () => {
    console.log('[Feature Flags] Provider is ready');
  });
  
  client.addHandler(ServerProviderEvents.Error, (event) => {
    console.error('[Feature Flags] Provider error:', event);
  });
  
  client.addHandler(ServerProviderEvents.ConfigurationChanged, () => {
    console.log('[Feature Flags] Configuration changed');
  });
  
  return client;
}

/**
 * Initialize the feature flag system
 * This should be called once during application startup
 */
export async function initializeFeatureFlags() {
  try {
    // The adapter initialization happens automatically when first used
    // We can pre-warm it by getting the OpenFeature client
    const client = OpenFeature.getClient();
    console.log('[Feature Flags] Initialized successfully');
    return client;
  } catch (error) {
    console.error('[Feature Flags] Failed to initialize:', error);
    // Continue with defaults if feature flag system is unavailable
  }
}
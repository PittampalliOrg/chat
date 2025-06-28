import { OpenFeature } from '@openfeature/server-sdk';
import { FlagdProvider } from '@openfeature/flagd-provider';

let initialized = false;

export async function initializeServerFeatureFlags() {
  if (initialized) return OpenFeature;
  
  const provider = new FlagdProvider({
    host: process.env.FLAGD_HOST || 'localhost',
    port: parseInt(process.env.FLAGD_PORT || '8013'),
  });
  
  try {
    await OpenFeature.setProviderAndWait(provider);
    initialized = true;
    console.log('[OpenFeature Server] Provider initialized successfully');
  } catch (error) {
    console.error('[OpenFeature Server] Failed to initialize provider:', error);
    // Continue with no-op provider for graceful degradation
  }
  
  return OpenFeature;
}
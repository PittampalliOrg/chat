import { OpenFeature, Client } from '@openfeature/server-sdk';
import { FlagdProvider } from '@openfeature/flagd-provider';

// Keep provider instance for connection reuse
let providerInstance: FlagdProvider | null = null;
let lastInitTime = 0;
const PROVIDER_TTL = 5000; // 5 seconds TTL for provider refresh

export async function initializeServerFeatureFlags(): Promise<Client> {
  const now = Date.now();
  
  // Force provider refresh if TTL expired or not initialized
  if (!providerInstance || (now - lastInitTime) > PROVIDER_TTL) {
    console.log(`[OpenFeature Server] Initializing provider at ${new Date().toISOString()}`);
    
    providerInstance = new FlagdProvider({
      host: process.env.FLAGD_HOST || 'localhost',
      port: Number.parseInt(process.env.FLAGD_PORT || '8013'),
      // Disable caching to ensure server-side flags are always fresh
      cache: 'disabled',
    });
    
    try {
      await OpenFeature.setProviderAndWait(providerInstance);
      lastInitTime = now;
      console.log('[OpenFeature Server] Provider initialized successfully');
    } catch (error) {
      console.error('[OpenFeature Server] Failed to initialize provider:', error);
      providerInstance = null;
      // Return a client anyway for graceful degradation
    }
  }
  
  // Always return a new client instance for fresh evaluation context
  const clientName = `server-${Date.now()}-${Math.random()}`;
  const client = OpenFeature.getClient(clientName);
  
  console.log(`[OpenFeature Server] Created client: ${clientName}`);
  
  return client;
}
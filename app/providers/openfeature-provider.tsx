'use client';

import { OpenFeatureProvider } from '@openfeature/react-sdk';
import { FlagdWebProvider } from '@openfeature/flagd-web-provider';
import { OpenFeature } from '@openfeature/web-sdk';
import { useEffect, useState } from 'react';

export function OpenFeatureClientProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize OpenFeature client
    const initializeClient = async () => {
      // For development, we'll proxy through Next.js API
      // In production, you might connect directly to flagd
      const provider = new FlagdWebProvider({
        host: window.location.hostname,
        port: window.location.port ? parseInt(window.location.port) : 80,
        pathPrefix: '/api/flagd',
        tls: window.location.protocol === 'https:',
      });

      try {
        await OpenFeature.setProvider(provider);
        console.log('[OpenFeature] Client provider initialized');
        setIsInitialized(true);
      } catch (error) {
        console.error('[OpenFeature] Failed to initialize:', error);
        setIsInitialized(true); // Continue with defaults
      }
    };

    if (typeof window !== 'undefined') {
      initializeClient();
    }
  }, []);

  if (!isInitialized) {
    return <>{children}</>;
  }

  return <OpenFeatureProvider>{children}</OpenFeatureProvider>;
}
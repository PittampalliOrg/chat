'use client';

import { useBooleanFlagValue, useStringFlagValue, useNumberFlagValue, useObjectFlagValue, useOpenFeatureClient } from '@openfeature/react-sdk';
import { useEffect, useState } from 'react';

export function FeatureFlagClient() {
  const [isConnected, setIsConnected] = useState(false);
  const client = useOpenFeatureClient();
  
  // Use OpenFeature hooks for real-time flag updates
  const enableNewUI = useBooleanFlagValue('enableNewUI', false);
  const welcomeMessage = useStringFlagValue('welcomeMessage', 'Welcome to our app!');
  const maxItems = useNumberFlagValue('maxItems', 10);
  const theme = useObjectFlagValue('theme', { primary: 'blue', secondary: 'green' });

  useEffect(() => {
    // Check if the client is ready
    if (client) {
      setIsConnected(true);
    }
  }, [client]);

  const flags = {
    enableNewUI,
    welcomeMessage,
    maxItems,
    theme,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`} />
        <span className="text-sm">{isConnected ? 'Connected to flagd' : 'Connecting...'}</span>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <pre className="text-sm">{JSON.stringify(flags, null, 2)}</pre>
      </div>

      {enableNewUI && (
        <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <p className="font-semibold">New UI Enabled!</p>
          <p className="text-sm mt-2">{welcomeMessage}</p>
          <p className="text-sm mt-1">Max items allowed: {maxItems}</p>
          <div className="mt-2 flex gap-2">
            <div 
              className="w-20 h-8 rounded" 
              style={{ backgroundColor: theme.primary || 'blue' }}
            />
            <div 
              className="w-20 h-8 rounded" 
              style={{ backgroundColor: theme.secondary || 'green' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
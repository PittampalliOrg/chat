'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import * as flagDefinitions from '@/lib/feature-flags/client';

export default function FlagOverridesPage() {
  const [overrides, setOverrides] = useState<Record<string, any>>({});

  // Load current overrides from cookie
  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('vercel-flag-overrides='));
    
    if (cookie) {
      try {
        const value = decodeURIComponent(cookie.split('=')[1]);
        setOverrides(JSON.parse(value));
      } catch (e) {
        console.error('Failed to parse flag overrides:', e);
      }
    }
  }, []);

  // Get all flag definitions
  const flags = Object.entries(flagDefinitions)
    .filter(([key, value]) => 
      typeof value === 'function' && 'key' in value && 'defaultValue' in value
    )
    .map(([name, flag]) => ({
      name,
      key: flag.key,
      defaultValue: flag.defaultValue,
      description: flag.description,
      options: flag.options,
    }));

  const updateFlag = (key: string, value: any) => {
    const newOverrides = { ...overrides, [key]: value };
    setOverrides(newOverrides);
    
    // Set cookie
    document.cookie = `vercel-flag-overrides=${encodeURIComponent(JSON.stringify(newOverrides))}; path=/; max-age=${60 * 60 * 24 * 30}`;
  };

  const clearOverride = (key: string) => {
    const newOverrides = { ...overrides };
    delete newOverrides[key];
    setOverrides(newOverrides);
    
    // Update cookie
    if (Object.keys(newOverrides).length > 0) {
      document.cookie = `vercel-flag-overrides=${encodeURIComponent(JSON.stringify(newOverrides))}; path=/; max-age=${60 * 60 * 24 * 30}`;
    } else {
      // Clear cookie
      document.cookie = 'vercel-flag-overrides=; path=/; max-age=0';
    }
  };

  const clearAllOverrides = () => {
    setOverrides({});
    document.cookie = 'vercel-flag-overrides=; path=/; max-age=0';
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Feature Flag Overrides</h1>
      
      <div className="mb-4">
        <Button onClick={clearAllOverrides} variant="outline">
          Clear All Overrides
        </Button>
      </div>

      <div className="space-y-4">
        {flags.map((flag) => (
          <div key={flag.key} className="border rounded p-4">
            <h3 className="font-semibold">{flag.key}</h3>
            <p className="text-sm text-gray-600 mb-2">{flag.description}</p>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Default: {String(flag.defaultValue)}</span>
              {overrides[flag.key] !== undefined && (
                <span className="text-sm font-semibold text-blue-600">
                  Override: {String(overrides[flag.key])}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2">
              {typeof flag.defaultValue === 'boolean' ? (
                <>
                  <Button
                    size="sm"
                    variant={overrides[flag.key] === true ? 'default' : 'outline'}
                    onClick={() => updateFlag(flag.key, true)}
                  >
                    Enable
                  </Button>
                  <Button
                    size="sm"
                    variant={overrides[flag.key] === false ? 'default' : 'outline'}
                    onClick={() => updateFlag(flag.key, false)}
                  >
                    Disable
                  </Button>
                </>
              ) : flag.options ? (
                flag.options.map((option: any) => (
                  <Button
                    key={option.value || option}
                    size="sm"
                    variant={overrides[flag.key] === (option.value || option) ? 'default' : 'outline'}
                    onClick={() => updateFlag(flag.key, option.value || option)}
                  >
                    {option.label || option}
                  </Button>
                ))
              ) : (
                <input
                  type="text"
                  className="px-2 py-1 border rounded"
                  placeholder={`Enter ${typeof flag.defaultValue}`}
                  value={overrides[flag.key] ?? ''}
                  onChange={(e) => {
                    const value = typeof flag.defaultValue === 'number' 
                      ? Number(e.target.value) 
                      : e.target.value;
                    updateFlag(flag.key, value);
                  }}
                />
              )}
              
              {overrides[flag.key] !== undefined && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => clearOverride(flag.key)}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
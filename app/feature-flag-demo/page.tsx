import { initializeServerFeatureFlags } from '@/lib/openfeature/server';
import { FeatureFlagClient } from './feature-flag-client';

// Force dynamic rendering to ensure server-side flags are always fresh
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FeatureFlagDemoPage() {
  // Get a fresh client for this request
  const client = await initializeServerFeatureFlags();
  
  // Add timestamp to verify fresh evaluation
  const evaluationTime = new Date().toISOString();
  console.log(`[Feature Flag Demo] Evaluating flags at ${evaluationTime}`);
  
  // Evaluate feature flags on the server
  const serverFlags = {
    enableNewUI: await client.getBooleanValue('enableNewUI', false),
    welcomeMessage: await client.getStringValue('welcomeMessage', 'Welcome to our app!'),
    maxItems: await client.getNumberValue('maxItems', 10),
    theme: await client.getObjectValue('theme', { primary: 'blue', secondary: 'green' }),
    evaluatedAt: evaluationTime,
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Feature Flag Demo</h1>
      
      <div className="grid gap-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Server-Side Evaluated Flags</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Evaluated at: {serverFlags.evaluatedAt} (refresh page to see updates)
          </p>
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <pre className="text-sm">{JSON.stringify(serverFlags, null, 2)}</pre>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Client-Side Feature Flags (Real-time Updates)</h2>
          <FeatureFlagClient />
        </section>

        <section className="mt-8">
          <h3 className="text-xl font-semibold mb-2">How to Test:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Access the flagd UI at <a href="http://flagd.localtest.me" className="text-blue-500 hover:underline">http://flagd.localtest.me</a></li>
            <li>Modify any of the feature flags (enableNewUI, welcomeMessage, maxItems, theme)</li>
            <li>Watch the client-side flags update in real-time without page refresh</li>
            <li>Refresh the page to see server-side flags update</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
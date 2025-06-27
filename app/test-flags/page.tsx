import * as flags from '@/lib/feature-flags/flags';

export default async function TestFlagsPage() {
  // Fetch all flag values
  const [
    reasoningModel,
    maxUploadSize,
    mcpServers,
    artifactCreation,
    weatherTool,
    codeExecution,
    imageGeneration,
    rateLimit,
    themeVariant,
    maintenance,
    debugLogs,
  ] = await Promise.all([
    flags.enableReasoningModel(),
    flags.maxFileUploadSize(),
    flags.enableMcpServers(),
    flags.enableArtifactCreation(),
    flags.enableWeatherTool(),
    flags.enableCodeExecution(),
    flags.enableImageGeneration(),
    flags.rateLimitRequestsPerMinute(),
    flags.uiThemeVariant(),
    flags.maintenanceMode(),
    flags.enableDebugLogs(),
  ]);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Feature Flags Test Page</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Current Flag Values</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>enable-reasoning-model: <span className={reasoningModel ? 'text-green-600' : 'text-red-600'}>{String(reasoningModel)}</span></div>
            <div>max-file-upload-size: <span className="text-blue-600">{maxUploadSize} MB</span></div>
            <div>enable-mcp-servers: <span className={mcpServers ? 'text-green-600' : 'text-red-600'}>{String(mcpServers)}</span></div>
            <div>enable-artifact-creation: <span className={artifactCreation ? 'text-green-600' : 'text-red-600'}>{String(artifactCreation)}</span></div>
            <div>enable-weather-tool: <span className={weatherTool ? 'text-green-600' : 'text-red-600'}>{String(weatherTool)}</span></div>
            <div>enable-code-execution: <span className={codeExecution ? 'text-green-600' : 'text-red-600'}>{String(codeExecution)}</span></div>
            <div>enable-image-generation: <span className={imageGeneration ? 'text-green-600' : 'text-red-600'}>{String(imageGeneration)}</span></div>
            <div>rate-limit-requests-per-minute: <span className="text-blue-600">{rateLimit}</span></div>
            <div>ui-theme-variant: <span className="text-purple-600">{themeVariant}</span></div>
            <div>maintenance-mode: <span className={maintenance ? 'text-red-600' : 'text-green-600'}>{String(maintenance)}</span></div>
            <div>enable-debug-logs: <span className={debugLogs ? 'text-green-600' : 'text-red-600'}>{String(debugLogs)}</span></div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Instructions</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Open the Vercel toolbar (usually at the bottom of the page)</li>
            <li>Navigate to the &quot;Feature Flags&quot; section</li>
            <li>You should see all the flags listed above</li>
            <li>Try changing a flag value and refresh this page</li>
            <li>The values should update based on your toolbar selections</li>
          </ol>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Note for Self-Hosted Deployments</h2>
          <p className="text-sm">
            Cookie overrides are enabled in non-production environments by default.
            To enable them in production, set the <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">ALLOW_FLAG_OVERRIDES</code> environment variable.
          </p>
        </div>
      </div>
    </div>
  );
}
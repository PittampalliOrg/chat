import { flag } from "flags/next";
import { openFeatureAdapter } from "./adapter";
import { identify } from "./identify";

/**
 * Type-safe feature flag definitions for the Next.js application
 * These flags correspond to the flags defined in the nextjs-app-features FeatureFlag CRD
 */

// AI Model Features
export const enableReasoningModel = flag<boolean>({
  key: "enable-reasoning-model",
  defaultValue: true,
  description: "Enable the advanced reasoning model",
  identify,
  adapter: openFeatureAdapter.booleanValue(),
});

// File Upload Configuration
export const maxFileUploadSize = flag<number>({
  key: "max-file-upload-size",
  defaultValue: 10, // 10MB default
  description: "Maximum file upload size in MB",
  identify,
  adapter: openFeatureAdapter.numberValue(),
});

// Feature Toggles
export const enableMcpServers = flag<boolean>({
  key: "enable-mcp-servers",
  defaultValue: true,
  description: "Enable MCP (Model Context Protocol) servers",
  identify,
  adapter: openFeatureAdapter.booleanValue(),
});

export const enableArtifactCreation = flag<boolean>({
  key: "enable-artifact-creation",
  defaultValue: true,
  description: "Enable artifact creation functionality",
  identify,
  adapter: openFeatureAdapter.booleanValue(),
});

export const enableWeatherTool = flag<boolean>({
  key: "enable-weather-tool",
  defaultValue: true,
  description: "Enable the weather tool",
  identify,
  adapter: openFeatureAdapter.booleanValue(),
});

// Experimental Features
export const enableCodeExecution = flag<boolean>({
  key: "enable-code-execution",
  defaultValue: false,
  description: "Enable code execution in sandbox",
  identify,
  adapter: openFeatureAdapter.booleanValue(),
});

export const enableImageGeneration = flag<boolean>({
  key: "enable-image-generation",
  defaultValue: false,
  description: "Enable AI image generation",
  identify,
  adapter: openFeatureAdapter.booleanValue(),
});

// Rate Limiting
export const rateLimitRequestsPerMinute = flag<number>({
  key: "rate-limit-requests-per-minute",
  defaultValue: 30,
  description: "Rate limit for API requests per minute",
  identify,
  adapter: openFeatureAdapter.numberValue(),
});

// UI Variants
export const uiThemeVariant = flag<string>({
  key: "ui-theme-variant",
  defaultValue: "classic",
  description: "UI theme variant for A/B testing",
  identify,
  adapter: openFeatureAdapter.stringValue(),
});

// System Features
export const maintenanceMode = flag<boolean>({
  key: "maintenance-mode",
  defaultValue: false,
  description: "Enable maintenance mode",
  identify,
  adapter: openFeatureAdapter.booleanValue(),
});

export const enableDebugLogs = flag<boolean>({
  key: "enable-debug-logs",
  defaultValue: false,
  description: "Enable debug logging",
  identify,
  adapter: openFeatureAdapter.booleanValue(),
});

// Note: The getEvaluationContext function has been removed
// Context is now handled automatically by the identify function

/**
 * Example usage in a server component:
 * 
 * ```typescript
 * import { enableReasoningModel } from '@/lib/feature-flags/flags';
 * 
 * export default async function MyComponent() {
 *   const isReasoningEnabled = await enableReasoningModel();
 *   
 *   if (isReasoningEnabled) {
 *     // Show reasoning model option
 *   }
 * }
 * ```
 */
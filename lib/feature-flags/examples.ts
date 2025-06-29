/**
 * Example implementations showing how to use feature flags in the Next.js application
 */

// Temporarily disabled imports until OpenFeature implementation is ready
// import {
//   maxFileUploadSize,
//   enableArtifactCreation,
//   enableWeatherTool,
//   maintenanceMode,
//   rateLimitRequestsPerMinute,
//   uiThemeVariant,
//   enableDebugLogs
// } from './flags';

/**
 * Example: Check file upload size limit
 */
export async function getMaxUploadSizeInBytes(): Promise<number> {
  // Temporarily use default value
  const maxSizeMB = 10; // await maxFileUploadSize();
  return maxSizeMB * 1024 * 1024; // Convert MB to bytes
}

/**
 * Example: Check if artifact creation is allowed
 */
export async function isArtifactCreationAllowed(): Promise<boolean> {
  // Temporarily use default value
  return true; // await enableArtifactCreation();
}

/**
 * Example: Weather tool availability check
 */
export async function isWeatherToolAvailable(): Promise<boolean> {
  // Temporarily use default value
  return true; // await enableWeatherTool();
}

/**
 * Example: Maintenance mode check
 */
export async function isInMaintenanceMode(): Promise<boolean> {
  // Temporarily use default value
  return false; // await maintenanceMode();
}

/**
 * Example: Get rate limit
 */
export async function getRateLimitPerMinute(): Promise<number> {
  // Temporarily use default value
  return 30; // await rateLimitRequestsPerMinute();
}

/**
 * Example: Get UI theme variant
 */
export async function getUITheme(): Promise<string> {
  // Temporarily use default value
  return 'classic'; // await uiThemeVariant();
}

/**
 * Example: Check if debug logging is enabled
 */
export async function isDebugLoggingEnabled(): Promise<boolean> {
  // Temporarily use default value
  return false; // await enableDebugLogs();
}

/**
 * Example: Validate file upload
 */
export async function validateFileUpload(fileSize: number): Promise<{ allowed: boolean; maxSize: number; reason?: string }> {
  const maxSize = await getMaxUploadSizeInBytes();
  
  if (fileSize > maxSize) {
    return {
      allowed: false,
      maxSize,
      reason: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`
    };
  }
  
  return { allowed: true, maxSize };
}

/**
 * Example: Rate limiter
 */
export async function checkRateLimit(userId: string, requestCount: number): Promise<{ allowed: boolean; limit: number }> {
  const limit = await getRateLimitPerMinute();
  
  return {
    allowed: requestCount < limit,
    limit
  };
}

/**
 * Example: UI customization
 */
export async function getThemeClasses(): Promise<string> {
  const theme = await getUITheme();
  
  const themeClasses = {
    classic: 'bg-white text-gray-900',
    modern: 'bg-slate-50 text-slate-900',
    minimal: 'bg-gray-50 text-gray-800'
  };
  
  return themeClasses[theme as keyof typeof themeClasses] || themeClasses.classic;
}

/**
 * Example: Middleware pattern for feature flags
 */
export async function withFeatureFlag<T>(
  flagCheck: () => Promise<boolean>,
  enabledHandler: () => T,
  disabledHandler?: () => T
): Promise<T> {
  const isEnabled = await flagCheck();
  
  if (isEnabled) {
    return enabledHandler();
  }
  
  if (disabledHandler) {
    return disabledHandler();
  }
  
  throw new Error('Feature is not available');
}

/**
 * Example usage in components:
 * 
 * ```typescript
 * // In a server component
 * import { isArtifactCreationAllowed } from '@/lib/feature-flags/examples';
 * 
 * export default async function MyComponent() {
 *   const canCreateArtifacts = await isArtifactCreationAllowed();
 *   
 *   return (
 *     <div>
 *       {canCreateArtifacts && <ArtifactCreator />}
 *     </div>
 *   );
 * }
 * ```
 */
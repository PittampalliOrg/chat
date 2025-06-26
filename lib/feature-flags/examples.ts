/**
 * Example implementations showing how to use feature flags in the Next.js application
 */

import {
  maxFileUploadSize,
  enableArtifactCreation,
  enableWeatherTool,
  maintenanceMode,
  rateLimitRequestsPerMinute,
  uiThemeVariant,
  enableDebugLogs
} from './flags';

/**
 * Example: Check file upload size limit
 */
export async function getMaxUploadSizeInBytes(): Promise<number> {
  const maxSizeMB = await maxFileUploadSize();
  return maxSizeMB * 1024 * 1024; // Convert MB to bytes
}

/**
 * Example: Check if artifact creation is enabled
 */
export async function canCreateArtifacts(): Promise<boolean> {
  return await enableArtifactCreation();
}

/**
 * Example: Get available AI tools based on feature flags
 */
export async function getAvailableTools() {
  const weatherEnabled = await enableWeatherTool();
  
  const tools = [];
  
  // Always available tools
  tools.push('create-document', 'update-document', 'request-suggestions');
  
  // Conditionally available tools
  if (weatherEnabled) {
    tools.push('get-weather');
  }
  
  return tools;
}

/**
 * Example: Check maintenance mode for middleware
 */
export async function isInMaintenanceMode(): Promise<boolean> {
  // No user context needed for global maintenance mode
  return await maintenanceMode();
}

/**
 * Example: Get rate limit for API endpoints
 * Note: User context is handled automatically by the identify function
 */
export async function getRateLimitForUser(): Promise<number> {
  return await rateLimitRequestsPerMinute();
}

/**
 * Example: Get UI theme variant for A/B testing
 * Note: User context is handled automatically by the identify function
 */
export async function getUserTheme(): Promise<string> {
  return await uiThemeVariant();
}

/**
 * Example: Conditional logging based on feature flag
 */
export async function debugLog(message: string, data?: any) {
  const debugEnabled = await enableDebugLogs();
  if (debugEnabled) {
    console.log(`[DEBUG] ${message}`, data);
  }
}

/**
 * Example: Using in API route handler
 * 
 * ```typescript
 * // app/api/upload/route.ts
 * import { getMaxUploadSizeInBytes } from '@/lib/feature-flags/examples';
 * 
 * export async function POST(request: Request) {
 *   const maxSize = await getMaxUploadSizeInBytes();
 *   
 *   const contentLength = request.headers.get('content-length');
 *   if (contentLength && parseInt(contentLength) > maxSize) {
 *     return new Response('File too large', { status: 413 });
 *   }
 *   
 *   // Process upload...
 * }
 * ```
 */

/**
 * Example: Using in middleware
 * 
 * ```typescript
 * // middleware.ts
 * import { isInMaintenanceMode } from '@/lib/feature-flags/examples';
 * 
 * export async function middleware(request: NextRequest) {
 *   if (await isInMaintenanceMode()) {
 *     return NextResponse.rewrite(new URL('/maintenance', request.url));
 *   }
 *   
 *   return NextResponse.next();
 * }
 * ```
 */
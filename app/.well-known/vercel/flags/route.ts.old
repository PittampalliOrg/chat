import { createFlagsDiscoveryEndpoint, getProviderData } from 'flags/next';
import {
  enableReasoningModel,
  maxFileUploadSize,
  enableMcpServers,
  enableArtifactCreation,
  enableWeatherTool,
  enableCodeExecution,
  enableImageGeneration,
  rateLimitRequestsPerMinute,
  uiThemeVariant,
  maintenanceMode,
  enableDebugLogs,
} from '../../../../lib/feature-flags';

export const dynamic = 'force-dynamic'; // defaults to auto

export const GET = createFlagsDiscoveryEndpoint(() => 
  getProviderData({
    enableReasoningModel,
    maxFileUploadSize,
    enableMcpServers,
    enableArtifactCreation,
    enableWeatherTool,
    enableCodeExecution,
    enableImageGeneration,
    rateLimitRequestsPerMinute,
    uiThemeVariant,
    maintenanceMode,
    enableDebugLogs,
  })
);
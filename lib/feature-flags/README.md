# Feature Flags Implementation

This directory contains the OpenFeature/flagd integration for the Next.js application.

## Architecture

The feature flag system consists of:

1. **Flagd Sidecar**: Runs alongside the Next.js container in Kubernetes
2. **OpenFeature SDK**: Provides the client interface for evaluating flags
3. **Flags SDK**: Provides type-safe, Next.js-optimized flag definitions
4. **FeatureFlag CRDs**: Kubernetes resources that define flag configurations

## Setup

The feature flags are automatically initialized when the flagd sidecar is injected into the pod. The sidecar connects to the Kubernetes API and watches for FeatureFlag CRDs in the namespace.

## Usage

### Basic Flag Evaluation

```typescript
import { enableReasoningModel } from '@/lib/feature-flags';

export default async function MyComponent() {
  const isEnabled = await enableReasoningModel();
  
  if (isEnabled) {
    // Show reasoning model option
  }
}
```

Note: User context is handled automatically by the `identify` function, which reads from cookies and headers.

### In API Routes

```typescript
import { getMaxUploadSizeInBytes } from '@/lib/feature-flags/examples';

export async function POST(request: Request) {
  const maxSize = await getMaxUploadSizeInBytes();
  
  // Use maxSize for validation
}
```

## Available Flags

### AI Features
- `enable-reasoning-model`: Toggle advanced reasoning model
- `enable-code-execution`: Enable code execution sandbox
- `enable-image-generation`: Enable AI image generation

### Configuration
- `max-file-upload-size`: Control file upload limits (MB)
- `rate-limit-requests-per-minute`: API rate limiting

### Feature Toggles
- `enable-mcp-servers`: MCP server functionality
- `enable-artifact-creation`: Artifact creation features
- `enable-weather-tool`: Weather tool availability

### UI/UX
- `ui-theme-variant`: A/B test different themes

### System
- `maintenance-mode`: Global maintenance mode
- `enable-debug-logs`: Debug logging

## Evaluation Context

The evaluation context is used for targeting rules:

```typescript
{
  userId: string,      // User identifier
  userTier: string,    // 'free' | 'premium' | 'enterprise'
  environment: string  // 'development' | 'production'
}
```

## Targeting Examples

Flags can have targeting rules defined in the FeatureFlag CRD:

```yaml
targeting:
  if:
    - var: environment
    - ==:
        - var: environment
        - production
    - on
    - off
```

## Troubleshooting

1. **Flags returning defaults**: Check if flagd sidecar is running
2. **Connection errors**: Verify flagd is listening on localhost:8013
3. **Flag not found**: Ensure FeatureFlag CRD exists in the namespace

## Local Development

For local development without Kubernetes:
1. Set `FLAGD_HOST` and `FLAGD_PORT` environment variables
2. Run flagd locally with a file source
3. Or use the default values (feature flags will use defaults)
# Feature Flags Setup Documentation

This document describes the complete feature flag implementation using OpenFeature and flagd.

## Architecture Overview

The feature flag system consists of:
1. **flagd service** - Centralized feature flag daemon running in Kubernetes
2. **FeatureFlag CRDs** - Kubernetes custom resources that define feature flags
3. **flagd UI** - Web interface for managing feature flags
4. **OpenFeature SDK** - Client and server SDKs for evaluating flags
5. **Next.js Integration** - Both server-side and client-side flag evaluation

## CDK8s Components

### 1. Feature Flag Service (`flagd-service-chart.ts`)
- Deploys flagd as a centralized service
- Watches FeatureFlag CRDs: `cdk8s-env-config`, `nextjs-app-features`, `demo-flags`
- Provides gRPC (8013), OFREP (8016), and metrics (8014) endpoints
- RBAC: ClusterRole and ClusterRoleBinding for reading FeatureFlag CRDs

### 2. Feature Flag UI (`flagd-ui-nextjs-chart.ts`)
- Next.js-based UI for managing feature flags
- Deployed in `nextjs` namespace
- Accessible at `http://flagd.localtest.me/feature`
- RBAC: ClusterRole for editing FeatureFlag CRDs

### 3. Feature Flag Configurations
- **`openfeature-config-chart.ts`** - Environment configuration flags
- **`nextjs-feature-flags-chart.ts`** - Application feature toggles
- **`feature-flags-demo-chart.ts`** - Demo flags for testing

### 4. Integration in `main.ts`
```typescript
// Phase 4.5: OpenFeature Configuration
const openfeatureConfig = new OpenFeatureConfigChart(app, 'openfeature-config');
openfeatureConfig.addDependency(infraApps);

// Phase 4.6: Flagd Service
const flagdService = new FlagdServiceChart(app, 'flagd-service', {
  enableServiceMonitor: false
});
flagdService.addDependency(openfeatureConfig);

// Phase 4.8: Flagd UI
const flagdUiNextJs = new FlagdUiNextJsChart(app, 'flagd-ui-nextjs', { namespace: 'nextjs' });
flagdUiNextJs.addDependency(flagdService);

// Phase 4.9: Feature Flags Demo
const featureFlagsDemo = new FeatureFlagsDemoChart(app, 'feature-flags-demo');
featureFlagsDemo.addDependency(flagdService);
```

## Next.js Integration

### 1. Environment Variables
In `nextjs-chart.ts`:
```typescript
FLAGD_HOST: 'flagd.default.svc.cluster.local',
FLAGD_PORT: '8013',
```

### 2. Server-Side Integration (`lib/openfeature/server.ts`)
```typescript
import { OpenFeature } from '@openfeature/server-sdk';
import { FlagdProvider } from '@openfeature/flagd-provider';

export async function initializeServerFeatureFlags() {
  const provider = new FlagdProvider({
    host: process.env.FLAGD_HOST || 'localhost',
    port: parseInt(process.env.FLAGD_PORT || '8013'),
  });
  await OpenFeature.setProviderAndWait(provider);
  return OpenFeature;
}
```

### 3. Client-Side Integration (`app/providers/openfeature-provider.tsx`)
```typescript
const provider = new FlagdWebProvider({
  host: window.location.hostname,
  port: window.location.port ? parseInt(window.location.port) : 80,
  pathPrefix: 'api/flagd',
  tls: window.location.protocol === 'https:',
});
```

### 4. API Proxy (`app/api/flagd/[...path]/route.ts`)
Proxies requests from browser to flagd service with:
- Connect protocol support
- Binary data handling
- Streaming support for EventStream
- CORS headers

### 5. Layout Integration
The app layout wraps children with `OpenFeatureClientProvider` for global access.

## Available Feature Flags

### 1. Demo Flags (`demo-flags`)
- `enableNewUI` - Boolean flag for UI features
- `welcomeMessage` - String variants: default, preview, beta
- `maxItems` - Number variants: small (10), medium (50), large (100)
- `theme` - Object variants with primary/secondary colors

### 2. Environment Config (`cdk8s-env-config`)
- `environment` - Current environment (dev/staging/prod)
- `branch` - Git branch name
- Various infrastructure settings

### 3. Next.js App Features (`nextjs-app-features`)
- `enableAIModels` - Toggle AI model availability
- `enableFileUpload` - Toggle file upload feature
- `rateLimit` - API rate limiting configuration
- `enableExperimentalFeatures` - Toggle experimental features

## Testing

1. **Access flagd UI**: `http://flagd.localtest.me/feature`
2. **Demo page**: `http://chat.localtest.me/feature-flag-demo`
3. **Port-forward alternative**: 
   ```bash
   kubectl port-forward -n nextjs deployment/flagd-ui-nextjs 8095:4000
   ```

## Deployment Order

The CDK8s sync waves ensure proper deployment order:
1. Namespaces and core platform components
2. OpenFeature configuration
3. Flagd service
4. Feature flag CRDs
5. Flagd UI
6. Application deployments with feature flag integration

## Troubleshooting

1. **Check flagd logs**: `kubectl logs -n default deployment/flagd`
2. **Verify feature flags**: `kubectl get featureflags -A`
3. **Check sync status**: Look for sync events in flagd logs
4. **Client connection**: Check browser console for EventStream connections

This setup ensures that after a cluster restart, all components will be recreated in the correct order with proper configuration.
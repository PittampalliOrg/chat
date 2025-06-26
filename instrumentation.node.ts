// instrumentation.node.ts – runs once at Node start-up (Next.js server)
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node"
import { BatchSpanProcessor, type SpanProcessor } from "@opentelemetry/sdk-trace-base"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { registerInstrumentations } from "@opentelemetry/instrumentation"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import { Resource, envDetector, processDetector, hostDetector, osDetector } from '@opentelemetry/resources'

const exporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
})

const spanProcessorInstance: SpanProcessor = new BatchSpanProcessor(exporter)

// Detect resources from environment
const detectResources = async () => {
  // Start with default resource
  let detectedResource = Resource.default();
  
  // Detect process information
  detectedResource = detectedResource.merge(await processDetector.detect());
  
  // Detect host information
  detectedResource = detectedResource.merge(await hostDetector.detect());
  
  // Detect OS information
  detectedResource = detectedResource.merge(await osDetector.detect());
  
  // Detect environment variables (including OTEL_RESOURCE_ATTRIBUTES)
  // This is done after other detectors to allow env vars to override
  detectedResource = detectedResource.merge(await envDetector.detect());
  
  // Add custom service attributes LAST to ensure they take precedence
  // These will override any service.name from OTEL_RESOURCE_ATTRIBUTES
  const customResource = new Resource({
    'service.name': process.env.OTEL_SERVICE_NAME || 'nextjs',
    'service.version': process.env.npm_package_version || '1.0.0',
    'deployment.environment': process.env.NODE_ENV || 'development',
    'k8s.namespace.name': process.env.K8S_NAMESPACE || 'nextjs',
    'k8s.pod.name': process.env.HOSTNAME || 'unknown',
  });
  
  // Merge custom resource last to ensure our service.name takes precedence
  detectedResource = detectedResource.merge(customResource);
  
  return detectedResource;
}

detectResources().then((resource) => {
  const provider = new NodeTracerProvider({
    resource,
    spanProcessors: [spanProcessorInstance], 
  })
  provider.register()
  
  registerInstrumentations({
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-winston": {
          enabled: false,
        },
      }),
    ],
  })
  
  console.log("Node.js opentelemetry instrumentation initialized with resource:", resource.attributes)
})

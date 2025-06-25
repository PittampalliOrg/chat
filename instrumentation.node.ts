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
  // Start with empty resource
  let detectedResource = Resource.empty();
  
  // Detect environment variables (including OTEL_RESOURCE_ATTRIBUTES)
  detectedResource = detectedResource.merge(await envDetector.detect());
  
  // Detect process information
  detectedResource = detectedResource.merge(await processDetector.detect());
  
  // Detect host information
  detectedResource = detectedResource.merge(await hostDetector.detect());
  
  // Detect OS information
  detectedResource = detectedResource.merge(await osDetector.detect());
  
  // Add custom service attributes
  detectedResource = detectedResource.merge(
    new Resource({
      'service.name': process.env.OTEL_SERVICE_NAME || 'nextjs',
      'service.version': process.env.npm_package_version || '1.0.0',
      'deployment.environment': process.env.NODE_ENV || 'development',
      'k8s.namespace.name': process.env.K8S_NAMESPACE || 'nextjs',
      'k8s.pod.name': process.env.HOSTNAME || 'unknown',
    })
  );
  
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

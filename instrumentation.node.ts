// instrumentation.node.ts – runs once at Node start-up (Next.js server)
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node"
import { BatchSpanProcessor, type SpanProcessor } from "@opentelemetry/sdk-trace-base"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { registerInstrumentations } from "@opentelemetry/instrumentation"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import { envDetector, processDetector, hostDetector, osDetector, detectResources, resourceFromAttributes } from '@opentelemetry/resources'

const exporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
})

const spanProcessorInstance: SpanProcessor = new BatchSpanProcessor(exporter)

// Detect resources from environment
const detectResourcesConfig = async () => {
  // Use the detectResources function with all detectors
  const detectedResource = detectResources({
    detectors: [
      processDetector,
      hostDetector,
      osDetector,
      envDetector,
    ],
  });
  
  // Add custom service attributes LAST to ensure they take precedence
  // These will override any service.name from OTEL_RESOURCE_ATTRIBUTES
  const customResource = resourceFromAttributes({
    'service.name': process.env.OTEL_SERVICE_NAME || 'nextjs',
    'service.version': process.env.npm_package_version || '1.0.0',
    'deployment.environment': process.env.NODE_ENV || 'development',
    'k8s.namespace.name': process.env.K8S_NAMESPACE || 'nextjs',
    'k8s.pod.name': process.env.HOSTNAME || 'unknown',
  });
  
  // Merge custom resource last to ensure our service.name takes precedence
  return detectedResource.merge(customResource);
}

detectResourcesConfig().then((resource) => {
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

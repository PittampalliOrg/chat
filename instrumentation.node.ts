// instrumentation.node.ts – runs once at Node start-up (Next.js server)
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node"
import { BatchSpanProcessor, type SpanProcessor } from "@opentelemetry/sdk-trace-base"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { registerInstrumentations } from "@opentelemetry/instrumentation"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"

const exporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
})

const spanProcessorInstance: SpanProcessor = new BatchSpanProcessor(exporter)

const provider = new NodeTracerProvider({
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

console.log("Node.js OpenTelemetry instrumentation initialized.")

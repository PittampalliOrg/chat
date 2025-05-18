import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto"
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { Resource } from "@opentelemetry/resources"
import { SEMRESATTRS_SERVICE_NAME } from "@opentelemetry/semantic-conventions"
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg"
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici"
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston"
import { NodeSDK } from "@opentelemetry/sdk-node"
import { BatchLogRecordProcessor, ConsoleLogRecordExporter } from "@opentelemetry/sdk-logs"
import { ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"

// Use the global object to store our SDK instance
// This prevents multiple initializations even if the module is loaded multiple times
declare global {
  var __OTEL_SDK__: {
    isInitialized: boolean
    sdk: NodeSDK | null
  }
}

// Initialize the global state if it doesn't exist
if (!global.__OTEL_SDK__) {
  global.__OTEL_SDK__ = {
    isInitialized: false,
    sdk: null,
  }
}

// Initialize the SDK only once
const initializeSDK = () => {
  if (global.__OTEL_SDK__.isInitialized || global.__OTEL_SDK__.sdk) {
    console.log("OpenTelemetry SDK already initialized, skipping")
    return
  }

  console.log("Initializing OpenTelemetry SDK")

  try {
    // Set up logging level
    if (process.env.OTEL_LOG_LEVEL) {
      console.log(`OTEL_LOG_LEVEL set to ${process.env.OTEL_LOG_LEVEL}`)
    } else {
      process.env.OTEL_LOG_LEVEL = "info"
    }

    const consoleSpanExp = new ConsoleSpanExporter()
    const consoleLogExp = new ConsoleLogRecordExporter()

    const traceExporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    })

    const metricExporter = new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
    })

    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
    })

    const logExporter = new OTLPLogExporter({
      url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
    })

    // Create the SDK with all components
    const sdk = new NodeSDK({
      resource: new Resource({
        [SEMRESATTRS_SERVICE_NAME]: "frontend",
      }),
      traceExporter,
      metricReader,
      logRecordProcessors: [new BatchLogRecordProcessor(logExporter), new BatchLogRecordProcessor(consoleLogExp)],
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-fs": { enabled: false },
          "@opentelemetry/instrumentation-fastify": { enabled: false },
        }),
        new PgInstrumentation({
          enhancedDatabaseReporting: true,
          addSqlCommenterCommentToQueries: true,
        }),
        new UndiciInstrumentation(),
        new WinstonInstrumentation(),
      ],
    })

    // Add console span exporter
    if (sdk["_tracerProvider"]) {
      sdk["_tracerProvider"].addSpanProcessor(new SimpleSpanProcessor(consoleSpanExp))
    }

    // Start the SDK
    sdk.start()
    console.log("Next.js server instrumentation started")

    // Store the SDK in the global object
    global.__OTEL_SDK__.sdk = sdk
    global.__OTEL_SDK__.isInitialized = true

    // Gracefully shut down the SDK on process exit
    process.on("SIGTERM", () => {
      if (global.__OTEL_SDK__.sdk) {
        global.__OTEL_SDK__.sdk
          .shutdown()
          .then(() => console.log("SDK shut down successfully"))
          .catch((error) => console.error("Error shutting down SDK", error))
          .finally(() => process.exit(0))
      }
    })
  } catch (e) {
    console.error("Error initializing OpenTelemetry SDK:", e)
  }
}

// Only run the initialization if not already initialized
if (!global.__OTEL_SDK__.isInitialized) {
  initializeSDK()
}

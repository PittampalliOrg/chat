"use client"

import { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator } from "@opentelemetry/core"
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web"
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { registerInstrumentations } from "@opentelemetry/instrumentation"
import { ZoneContextManager } from "@opentelemetry/context-zone"
import { LoggerProvider, BatchLogRecordProcessor, ConsoleLogRecordExporter } from "@opentelemetry/sdk-logs"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto"
import { SEMRESATTRS_SERVICE_NAME } from "@opentelemetry/semantic-conventions"
import { Resource } from "@opentelemetry/resources"
import { v4 as uuidv4 } from "uuid"

// Use window object to store initialization state
declare global {
  interface Window {
    __OTEL_BROWSER_SDK__: {
      isInitialized: boolean
    }
  }
}

export function register() {
  // Skip if not in browser
  if (typeof window === "undefined") {
    return
  }

  // Initialize the global state if it doesn't exist
  if (!window.__OTEL_BROWSER_SDK__) {
    window.__OTEL_BROWSER_SDK__ = {
      isInitialized: false,
    }
  }

  // Skip if already initialized
  if (window.__OTEL_BROWSER_SDK__.isInitialized) {
    console.log("Browser OpenTelemetry already initialized, skipping")
    return
  }

  console.log("Initializing browser OpenTelemetry")

  try {
    // Setup resource and providers
    const resource = new Resource({
      [SEMRESATTRS_SERVICE_NAME]: "next-app-browser",
      "session.instance.id": uuidv4(),
    })

    const traceExporter = new OTLPTraceExporter({
      url: process.env.NEXT_PUBLIC_OTEL_TRACES_ENDPOINT || "/api/telemetry/traces",
    })

    const logExporter = new OTLPLogExporter({
      url: process.env.NEXT_PUBLIC_OTEL_LOGS_ENDPOINT || "/api/telemetry/logs",
    })

    const consoleSpanExp = new ConsoleSpanExporter()
    const consoleLogExp = new ConsoleLogRecordExporter()

    const tracerProvider = new WebTracerProvider({ resource })

    tracerProvider.addSpanProcessor(new BatchSpanProcessor(traceExporter))
    tracerProvider.addSpanProcessor(new SimpleSpanProcessor(consoleSpanExp))

    tracerProvider.register({
      contextManager: new ZoneContextManager(),
      propagator: new CompositePropagator({
        propagators: [new W3CBaggagePropagator(), new W3CTraceContextPropagator()],
      }),
    })

    const loggerProvider = new LoggerProvider({ resource })
    loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter))
    loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(consoleLogExp))

    // Register standard OTel instrumentations
    registerInstrumentations({
      tracerProvider,
      loggerProvider,
      instrumentations: [
        getWebAutoInstrumentations({
          "@opentelemetry/instrumentation-fetch": {
            propagateTraceHeaderCorsUrls: /.*/,
            clearTimingResources: true,
            applyCustomAttributesOnSpan(span) {
              span.setAttribute("app.synthetic_request", "false")
            },
          },
          "@opentelemetry/instrumentation-xml-http-request": {
            propagateTraceHeaderCorsUrls: /.*/,
            clearTimingResources: true,
            applyCustomAttributesOnSpan(span) {
              span.setAttribute("app.synthetic_request", "false")
            },
          },
          "@opentelemetry/instrumentation-document-load": {
            enabled: true,
            applyCustomAttributesOnSpan: {
              documentLoad(span) {
                span.setAttribute("docLoad.testAttr", true)
              },
              documentFetch(span) {
                span.setAttribute("docFetch.testAttr", true)
              },
              resourceFetch(span) {
                span.setAttribute("resourceFetch.testAttr", true)
              },
            },
          },
          "@opentelemetry/instrumentation-user-interaction": {
            enabled: true,
            eventNames: ["click", "keypress", "change", "submit"],
          },
        }),
      ],
    })

    // Mark as initialized
    window.__OTEL_BROWSER_SDK__.isInitialized = true
  } catch (e) {
    console.error("Error initializing browser OpenTelemetry:", e)
  }
}

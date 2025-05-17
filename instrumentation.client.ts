// instrumentation.browser.ts
"use client";

import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { BatchSpanProcessor,  ConsoleSpanExporter, 
  SimpleSpanProcessor,   } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from '@opentelemetry/sdk-logs';

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { Resource } from '@opentelemetry/resources';
import { v4 as uuidv4 } from 'uuid';

import {
  ConsoleLogRecordExporter,
} from '@opentelemetry/sdk-logs';
// Import our new Owner Stack patch
// import { initGlobalOwnerStackLogging } from './instrumentation-utils';

export function register() {
  // 1) Initialize the global patch for console.error => captureOwnerStack
  // initGlobalOwnerStackLogging();

  // 2) Setup resource and providers
  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'next-app-browser',
    'session.instance.id': uuidv4(),
  });

  const traceExporter = new OTLPTraceExporter({
    url: process.env.NEXT_PUBLIC_OTEL_TRACES_ENDPOINT || "/api/telemetry/traces",
  });
  const logExporter = new OTLPLogExporter();

const consoleSpanExp  = new ConsoleSpanExporter();        // « NEW »
const consoleLogExp   = new ConsoleLogRecordExporter(); 

  const tracerProvider = new WebTracerProvider({ resource });

  tracerProvider.addSpanProcessor(new BatchSpanProcessor(traceExporter));
  tracerProvider.addSpanProcessor(new SimpleSpanProcessor(consoleSpanExp));
  tracerProvider.register({
    contextManager: new ZoneContextManager(),
    propagator: new CompositePropagator({
      propagators: [new W3CBaggagePropagator(), new W3CTraceContextPropagator()],
    }),
  });

  const loggerProvider = new LoggerProvider({ resource });
  loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));
  loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(consoleLogExp));

  // 3) Register standard OTel instrumentations
  registerInstrumentations({
    tracerProvider,
    loggerProvider,
    instrumentations: [
      getWebAutoInstrumentations({
        '@opentelemetry/instrumentation-fetch': {
          propagateTraceHeaderCorsUrls: /.*/,
          clearTimingResources: true,
          applyCustomAttributesOnSpan(span) {
            span.setAttribute('app.synthetic_request', 'false');
          },
        },
        '@opentelemetry/instrumentation-xml-http-request': {
          propagateTraceHeaderCorsUrls: /.*/,
          clearTimingResources: true,
          applyCustomAttributesOnSpan(span) {
            span.setAttribute('app.synthetic_request', 'false');
          },
        },
        '@opentelemetry/instrumentation-document-load': {
          enabled: true,
          applyCustomAttributesOnSpan: {
            documentLoad(span) {
              span.setAttribute('docLoad.testAttr', true);
            },
            documentFetch(span) {
              span.setAttribute('docFetch.testAttr', true);
            },
            resourceFetch(span) {
              span.setAttribute('resourceFetch.testAttr', true);
            },
          },
        },
        '@opentelemetry/instrumentation-user-interaction': {
          enabled: true,
          eventNames: ['click', 'keypress', 'change', 'submit'],
        },
      }),
    ],
  });
}

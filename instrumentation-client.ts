// instrumentation.client.ts  – runs only in the browser
import { WebTracerProvider }     from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor }    from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter }     from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager }    from '@opentelemetry/context-zone';
import { B3Propagator }          from '@opentelemetry/propagator-b3';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';

// 2️⃣  OTLP exporter (HTTP/proto) – works with your /api/telemetry proxy
const exporter = new OTLPTraceExporter({
  url: process.env.NEXT_PUBLIC_OTEL_TRACES_ENDPOINT ?? '/api/traces',
});

// 3️⃣  Provider with **spanProcessors** array
const provider = new WebTracerProvider({
  spanProcessors: [new BatchSpanProcessor(exporter)],
});

// 4️⃣  Register & wire context/propagation
provider.register({
  contextManager: new ZoneContextManager(),
  propagator: new B3Propagator(),
});

// 5️⃣  Auto-instrument browser APIs
registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations({
      '@opentelemetry/instrumentation-xml-http-request': { clearTimingResources: true },
    }),
  ],
});

console.log('OpenTelemetry client SDK initialised (2.x)');

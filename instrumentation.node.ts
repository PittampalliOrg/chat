// instrumentation.node.ts – runs once at Node start-up (Next.js server)
import { NodeTracerProvider }         from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor }         from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter }          from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes }     from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { registerInstrumentations }   from '@opentelemetry/instrumentation';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// 1️⃣  Describe the service that emits the telemetry
const resource = resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: 'nextjs-server',
});

// 2️⃣  Exporter: OTLP over HTTP (2.x replacement for CollectorTraceExporter)
const exporter = new OTLPTraceExporter(
  // {url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces'}
);

// 3️⃣  Provider with constructor-configured processors (SDK 2.x pattern)
const provider = new NodeTracerProvider({
  resource,
  spanProcessors: [new BatchSpanProcessor(exporter)],
});
provider.register();

// 4️⃣  Automatic instrumentation
registerInstrumentations({
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        applyCustomAttributesOnSpan: span => span.setAttribute('foo2', 'bar2'),
      },
    }),
  ],
});

console.log('Node instrumentation initialised (SDK 2.x)');

// export OTEL_TRACES_EXPORTER="otlp"
// export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"
// export OTEL_EXPORTER_OTLP_COMPRESSION="gzip"
// export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="https://your-endpoint"
// export OTEL_EXPORTER_OTLP_HEADERS="x-api-key=your-api-key"
// export OTEL_EXPORTER_OTLP_TRACES_HEADERS="x-api-key=your-api-key"
// export OTEL_RESOURCE_ATTRIBUTES="service.namespace=my-namespace"
// export OTEL_NODE_RESOURCE_DETECTORS="env,host,os,serviceinstance"
// export OTEL_SERVICE_NAME="client"
// export NODE_OPTIONS="--require @opentelemetry/auto-instrumentations-node/register"
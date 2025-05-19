import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { CollectorTraceExporter } from '@opentelemetry/exporter-collector';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

const exporter = new CollectorTraceExporter();
const provider = new NodeTracerProvider();

provider.register();

registerInstrumentations({
  instrumentations: [
    getNodeAutoInstrumentations({
      // load custom configuration for http instrumentation
      '@opentelemetry/instrumentation-http': {
        applyCustomAttributesOnSpan: (span) => {
          span.setAttribute('foo2', 'bar2');
        },
      },
    }),
  ],
});

console.log('Node instrumentation loaded');


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
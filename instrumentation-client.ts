// instrumentation.client.ts  – runs only in the browser
import { WebTracerProvider }     from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor }    from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter }     from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager }    from '@opentelemetry/context-zone';
import { B3Propagator }          from '@opentelemetry/propagator-b3';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';

// 2️⃣  OTLP exporter (HTTP/proto) – works with your /api/telemetry proxy
const exporter = new OTLPTraceExporter({
  url: typeof window !== 'undefined' ? `${window.location.origin}/api/traces` : 'http://localhost:3000/api/traces',
}); 

// 3️⃣  Initialize provider with resource configuration
async function initializeProvider() {
  // Start with default resource and merge with custom attributes
  const resource = defaultResource()
    .merge(
      resourceFromAttributes({
        'service.name': 'nextjs-browser',
        'service.version': '1.0.0',
        'deployment.environment': 'production',
        'telemetry.sdk.language': 'webjs',
      })
    );

  const provider = new WebTracerProvider({
    resource,
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

  console.log('OpenTelemetry client SDK initialised with resource:', resource.attributes);
}

// Initialize the provider
initializeProvider();

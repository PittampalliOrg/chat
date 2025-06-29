import { type NextRequest, NextResponse } from "next/server";

const COLLECTOR =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
  "http://alloy.monitoring.svc.cluster.local:4318";          // inside-cluster DNS

export const config = {
  // raise body limit to 5 MB – OTLP batches can be big
  api: { bodyParser: { sizeLimit: "5mb" } },
};

export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    },
  });
}

export async function POST(req: NextRequest) {
  const upstream = await fetch(`${COLLECTOR}/v1/traces`, {
    method: "POST",
    headers: {
      "content-type": req.headers.get("content-type") ?? "application/x-protobuf",
      traceparent: req.headers.get("traceparent") ?? "",
      tracestate: req.headers.get("tracestate") ?? "",
      // add X-Scope-OrgID here if you use multi-tenant Mimir
    },
    body: await req.arrayBuffer(),
  });

  return new NextResponse(null, {
    status: upstream.status,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

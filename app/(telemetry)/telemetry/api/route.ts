import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Forward the telemetry data to your collector
  const collectorUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces"

  try {
    await fetch(collectorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to forward telemetry:", error)
    return NextResponse.json({ success: false, error: "Failed to forward telemetry" }, { status: 500 })
  }
}

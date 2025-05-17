import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Forward the metrics data to Prometheus
  const prometheusUrl = process.env.PROMETHEUS_ENDPOINT || "http://prometheus:4318/v1/metrics"

  try {
    await fetch(prometheusUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to forward metric telemetry:", error)
    return NextResponse.json({ success: false, error: "Failed to forward metric telemetry" }, { status: 500 })
  }
}

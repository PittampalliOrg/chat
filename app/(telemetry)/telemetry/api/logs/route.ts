import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Forward the logs data to Loki
  const lokiUrl = process.env.LOKI_ENDPOINT || "http://loki:4318/v1/logs"

  try {
    await fetch(lokiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to forward log telemetry:", error)
    return NextResponse.json({ success: false, error: "Failed to forward log telemetry" }, { status: 500 })
  }
}

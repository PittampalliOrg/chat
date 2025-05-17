import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Forward the telemetry data to Tempo
  const tempoUrl = process.env.TEMPO_ENDPOINT || "http://tempo:4318/v1/traces"

  try {
    await fetch(tempoUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to forward trace telemetry:", error)
    return NextResponse.json({ success: false, error: "Failed to forward trace telemetry" }, { status: 500 })
  }
}

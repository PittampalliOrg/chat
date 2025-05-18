import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";

export const runtime = "nodejs"; // Ensure this route runs in the Node runtime

export async function GET(req: NextRequest) {
  if (req.headers.get("x-api-key") !== process.env.X_API_KEY) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  await redis.flushAll();  
  return Response.json({ message: "Redis cleaned" }, { status: 200 });
}

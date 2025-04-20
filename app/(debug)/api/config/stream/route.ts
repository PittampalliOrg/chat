import { NextRequest } from "next/server";
import { DaprClient, CommunicationProtocolEnum } from "@dapr/dapr";

// lib/dapr/client.ts
export const dapr = new DaprClient({
  communicationProtocol: CommunicationProtocolEnum.GRPC,
  daprHost: process.env.DAPR_HOST ?? "localhost",
  daprPort: process.env.DAPR_GRPC_PORT ?? "50002",
});


// -----------------------------------------------------------------------------
// Dapr Configuration ➜ Server‑Sent Events route
// -----------------------------------------------------------------------------
// This handler exposes /api/config/stream.  It streams the current values and
// subsequent changes of the given configuration keys stored in the Redis‑backed
// Dapr configuration store, so that a browser can listen via EventSource.
// -----------------------------------------------------------------------------

const STORE = "configstore";
// const KEYS: string[] = ["POSTGRES_PORT", "POSTGRES_HOST", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB", "POSTGRES_SSL"]; 

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder();

  const rs = new ReadableStream<Uint8Array>({
    async start(controller) {
      /* 1️⃣  send the current snapshot first */
      try {
        const initial = await dapr.configuration.get(STORE);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initial.items)}\n\n`),
        );
      } catch (err) {
        controller.error(err);
        return;
      }

      /* 2️⃣  subscribe to live updates */
      const sub = await dapr.configuration.subscribe(
        STORE,
        // KEYS,
        async (cfg) => {
          // async → returns Promise<void> so the TS signature matches
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(cfg.items)}\n\n`),
          );
        },
      );

      // store handle so we can stop it when the client disconnects
      (this as any).sub = sub;
    },

    cancel() {
      (this as any)?.sub?.stop();
    },
  });

  return new Response(rs, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

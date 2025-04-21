export const dynamic = 'force-dynamic'; 

import { NextRequest } from "next/server";
import { getDaprClient } from "@/lib/dapr/client";

const STORE = "configstore";

export async function GET(_req: NextRequest) {
  const dapr = await getDaprClient();
  if (!dapr) {
    return new Response("Dapr not initialized during build.", { status: 503 });
  }

  const encoder = new TextEncoder();

  const rs = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const initial = await dapr.configuration.get(STORE);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initial.items)}\n\n`),
        );
      } catch (err) {
        controller.error(err);
        return;
      }

      const sub = await dapr.configuration.subscribe(
        STORE,
        async (cfg) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(cfg.items)}\n\n`),
          );
        },
      );
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

// lib/dapr/client.ts
import type { DaprClient } from "@dapr/dapr";

declare global {
  var __dapr__: DaprClient | undefined;
}

export async function getDaprClient(): Promise<DaprClient | undefined> {
  // ⛔️ Never run inside the build pipeline
  if (process.env.NEXT_PHASE === "phase-production-build") return undefined;

  // Reuse the singleton initialised by instrumentation.ts
  if (global.__dapr__) return global.__dapr__;

  // Fallback (e.g. CLI scripts started under `dapr run`)
  const { DaprClient, CommunicationProtocolEnum } = await import("@dapr/dapr");
  global.__dapr__ = new DaprClient({
    communicationProtocol: CommunicationProtocolEnum.GRPC,
    daprHost: process.env.DAPR_HOST ?? "localhost",
    daprPort: process.env.DAPR_GRPC_PORT ?? "50002",
  });
  return global.__dapr__;
}

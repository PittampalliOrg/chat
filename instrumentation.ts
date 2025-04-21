// // 🚫  NO top‑level imports from '@dapr/dapr' or other Node‑only libs.

// // instrumentation.ts
// const SECRET_STORE = 'localsecretstore';
// const REQUIRED = [
//   'POSTGRES_URL',            // still useful in dev/staging
//   'AZURE_RESOURCE_NAME',
//   'ANTHROPIC_API_KEY',
//   'AZURE_API_KEY',
//   'OPENAI_API_KEY',
//   'NEXTAUTH_SECRET',
//   'AUTH_TRUST_HOST',
// ] as const;

// export async function register() {
//   // ➜ This guard prevents the file from running – and being *resolved* –
//   //    in the Edge bundle.
//   if (process.env.NEXT_RUNTIME !== 'nodejs') return;

//   // Lazily import Dapr *after* the guard so the Edge compiler never sees it
//   const { DaprClient, CommunicationProtocolEnum } =
//     await import('@dapr/dapr' /* webpackIgnore: true */);

//   const dapr = new DaprClient({
//     communicationProtocol: CommunicationProtocolEnum.GRPC,
//     daprHost: process.env.DAPR_HOST ?? 'localhost',
//     daprPort: process.env.DAPR_GRPC_PORT ?? '50002',
//   });

//   const missing = REQUIRED.filter((k) => !process.env[k]);
//   if (!missing.length) return;

//   const secrets = await Promise.all(
//     missing.map(async (k) => {
//       const res = await dapr.secret.get(SECRET_STORE, k);
//       return [k, (res as Record<string, string>)[k] ?? ''] as const;
//     }),
//   );

//   for (const [k, v] of secrets) {
//     if (!v) throw new Error(`Secret "${k}" missing in ${SECRET_STORE}`);
//     (process.env as Record<string, string | undefined>)[k] = v;
//   }
// }

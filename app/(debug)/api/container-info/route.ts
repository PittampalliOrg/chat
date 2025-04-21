// GET /api/container-info
import os from 'node:os';
import type { NextRequest } from 'next/server';

export async function GET(_req: NextRequest) {
  const env = Object.fromEntries(
    Object.entries(process.env).map(([k, v]) => [k, v ?? '']),
  );

  const ips = Object.values(os.networkInterfaces())
    .flatMap((ifs) => (ifs ?? []).filter((i) => i.family === 'IPv4'))
    .map((i) => i.address);

  return Response.json({
    process: { args: process.argv, pwd: process.cwd() },
    env,
    network: {
      hostname: os.hostname(),
      ips,
      port: (process.env.PORT || '3000').toString(),
    },
  });
}

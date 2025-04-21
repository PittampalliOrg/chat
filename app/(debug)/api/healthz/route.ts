// GET /healthz
import type { NextRequest } from 'next/server';
import { createFactory } from '@/lib/repository/factory';

export async function GET(_req: NextRequest) {
  const repo = await createFactory().create();
  try {
    // simple connectivity probe
    await repo.list();
    return Response.json({ status: 'OK' });
  } catch {
    return Response.json({ status: 'FAILED' }, { status: 500 });
  } finally {
    await repo.dispose();
  }
}

import { NextResponse } from 'next/server';
import { createFactory } from '@/lib/repository/factory';
import type { Item } from '@/lib/repository/types';

interface ConnectionInfo {
  usingDapr: boolean;
  storeName: string | null;
  kind: string;
}


/* ---------- helpers ---------- */
async function repo() {
  // `any` cast lets us access impl‑specific fields (`kind`, `storeName`)
  const r = (await createFactory().create()) as any;
  return {
    r,
    done: () => r.dispose(),
    isReal: typeof r.isReal === 'function' ? r.isReal() : true,
    connection: {
      usingDapr: r.kind === 'dapr',
      storeName: r.storeName ?? null,
      kind: r.kind ?? 'unknown',
    } as ConnectionInfo,
  };
}
/* ---------- /api/todos ---------- */
export async function GET() {
  const { r, done, isReal, connection } = await repo();
  const items = await r.list();
  await done();
  return NextResponse.json(
    { items, message: isReal ? null : 'No database configured – data is kept in‑memory.', connection },
    { status: 200 },
  );
}

export async function POST(req: Request) {
  const { r, done } = await repo();
  const item: Item = await req.json();
  const created = await r.create(item);
  await done();
  return NextResponse.json(created, { status: 200 });
}
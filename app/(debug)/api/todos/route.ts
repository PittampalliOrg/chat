import { NextResponse } from 'next/server';
import { createFactory } from '@/lib/repository/factory';
import type { Item } from '@/lib/repository/types';

/* ---------- helpers ---------- */
async function repo() {
  const r = await createFactory().create();
  return {
    r,
    done: () => r.dispose(),
    isReal: r.isReal(),
  };
}

/* ---------- /api/todos ---------- */
export async function GET() {
  const { r, done, isReal } = await repo();
  const items = await r.list();
  await done();
  return NextResponse.json(
    { items, message: isReal ? null : 'No database configured – data is kept in‑memory.' },
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

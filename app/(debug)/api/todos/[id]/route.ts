// app/(debug)/api/todos/[id]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createFactory } from '@/lib/repository/factory';

async function repo() {
  const r = await createFactory().create();
  return { r, done: () => r.dispose() };
}

// GET /api/todos/:id
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { r, done } = await repo();
  const { id } = await params;               // <- params is now a Promise
  const item   = await r.get(id);
  await done();
  return item
    ? NextResponse.json(item)
    : new NextResponse(null, { status: 404 });
}

// PUT /api/todos/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { r, done } = await repo();
  const { id }  = await params;
  const body    = await request.json();
  body.id       = id;

  const updated = await r.update(body);
  await done();
  return updated
    ? NextResponse.json(updated)
    : new NextResponse(null, { status: 404 });
}

// DELETE /api/todos/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { r, done } = await repo();
  const { id } = await params;
  await r.delete(id);
  await done();
  return new NextResponse(null, { status: 204 });
}

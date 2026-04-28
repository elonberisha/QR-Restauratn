import { NextRequest, NextResponse } from "next/server";
import { removeOrder } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "ID mungon" }, { status: 400 });
  const removed = await removeOrder(id);
  return NextResponse.json({ ok: removed });
}

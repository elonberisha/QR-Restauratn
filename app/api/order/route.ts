import { NextRequest, NextResponse } from "next/server";
import { addOrder } from "@/lib/store";
import { findItem } from "@/lib/menu";
import type { Order, OrderItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Incoming = {
  table?: number | string;
  items?: Array<{ id?: string; qty?: number }>;
};

export async function POST(req: NextRequest) {
  let body: Incoming;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tableNum = Number(body.table);
  if (!Number.isInteger(tableNum) || tableNum < 1 || tableNum > 99) {
    return NextResponse.json({ error: "Tavolinë e pavlefshme" }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Porosia është e zbrazët" }, { status: 400 });
  }

  const items: OrderItem[] = [];
  for (const raw of body.items) {
    const qty = Math.max(1, Math.min(99, Number(raw.qty) || 0));
    const item = raw.id ? findItem(String(raw.id)) : undefined;
    if (!item || qty < 1) continue;
    const existing = items.find((x) => x.id === item.id);
    if (existing) existing.qty += qty;
    else items.push({ id: item.id, name: item.name, qty });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "Asnjë artikull i vlefshëm" }, { status: 400 });
  }

  const order: Order = {
    id: crypto.randomUUID(),
    table: tableNum,
    items,
    createdAt: Date.now(),
  };

  try {
    await addOrder(order);
  } catch {
    return NextResponse.json(
      { error: "Porosia nuk u ruajt. Kontrollo lidhjen me Redis." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, id: order.id });
}

import { NextResponse } from "next/server";
import { getStorageDiagnostics, listOrders } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Diagnostic endpoint — useful when wiring up Upstash on Vercel.
// Tells you which storage backend is active and how many orders are stored.
export async function GET() {
  let orderCount = 0;
  let error: string | null = null;

  try {
    const orders = await listOrders();
    orderCount = orders.length;
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown storage error";
  }

  const diagnostics = getStorageDiagnostics();

  return NextResponse.json(
    {
      ok: error === null,
      ...diagnostics,
      orderCount,
      error,
    },
    {
      status: error === null ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

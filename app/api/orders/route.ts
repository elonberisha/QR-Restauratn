import { NextResponse } from "next/server";
import { listOrders } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const orders = await listOrders();
  return NextResponse.json(
    { orders },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}

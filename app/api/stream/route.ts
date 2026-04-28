import { NextRequest } from "next/server";
import { bus, listOrders, storageBackend } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel Hobby max 60s for streamed responses; client auto-reconnects.
export const maxDuration = 60;

const RECONNECT_BEFORE_TIMEOUT_MS = 55_000;
const HEARTBEAT_MS = 15_000;
// Fallback poll catches missed bus events and cross-instance Vercel changes.
const FALLBACK_POLL_MS = 1_500;

export async function GET(req: NextRequest) {
  const enc = new TextEncoder();
  let cancelled = false;
  let lastSig = "";
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let fallback: ReturnType<typeof setInterval> | null = null;
  let endTimer: ReturnType<typeof setTimeout> | null = null;
  let onChange: (() => void) | null = null;
  let pushScheduled = false;

  const stream = new ReadableStream({
    async start(controller) {
      function safeEnqueue(chunk: Uint8Array) {
        if (cancelled) return;
        try {
          controller.enqueue(chunk);
        } catch {
          cancelled = true;
        }
      }

      function send(event: string, data: unknown) {
        const payload =
          `event: ${event}\n` +
          `data: ${JSON.stringify(data)}\n\n`;
        safeEnqueue(enc.encode(payload));
      }

      async function pushOrders() {
        if (cancelled) return;
        try {
          const orders = await listOrders();
          const sig =
            orders.length +
            ":" +
            orders.map((o) => `${o.id}@${o.createdAt}`).join(",");
          if (sig !== lastSig) {
            lastSig = sig;
            send("orders", { orders, storage: storageBackend });
          }
        } catch (e) {
          send("store-error", {
            message: e instanceof Error ? e.message : "Storage read failed",
          });
        }
      }

      // Coalesce burst of events into a single push
      function schedulePush() {
        if (pushScheduled || cancelled) return;
        pushScheduled = true;
        setTimeout(() => {
          pushScheduled = false;
          pushOrders();
        }, 30);
      }

      // Initial state
      send("hello", {
        ts: Date.now(),
        storage: storageBackend,
      });
      await pushOrders();

      // Subscribe to in-process change events (instant push within same instance)
      onChange = () => schedulePush();
      bus.on("change", onChange);

      // Heartbeat keeps the connection alive across proxies
      heartbeat = setInterval(() => {
        safeEnqueue(enc.encode(`: ping ${Date.now()}\n\n`));
      }, HEARTBEAT_MS);

      fallback = setInterval(() => pushOrders(), FALLBACK_POLL_MS);

      // Close before Vercel timeout so EventSource reconnects cleanly
      endTimer = setTimeout(() => {
        send("bye", { reason: "rotate" });
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      }, RECONNECT_BEFORE_TIMEOUT_MS);

      // If the client aborts, clean up
      req.signal?.addEventListener("abort", () => {
        cleanup();
        try { controller.close(); } catch { /* ignore */ }
      });
    },
    cancel() {
      cleanup();
    },
  });

  function cleanup() {
    cancelled = true;
    if (heartbeat) clearInterval(heartbeat);
    if (fallback) clearInterval(fallback);
    if (endTimer) clearTimeout(endTimer);
    if (onChange) bus.off("change", onChange);
    heartbeat = fallback = endTimer = null;
    onChange = null;
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

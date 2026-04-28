import { Redis } from "@upstash/redis";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Order } from "./types";

const HASH_KEY = "enisi:orders";

// ── Storage backends ────────────────────────────────────────────────────────
// Priority: Upstash Redis (prod) → JSON file (dev / writable serverless tmp)
// → in-memory only.

const hasUpstash =
  !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

const redis = hasUpstash
  ? new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null;

// JSON file location:
//  - In dev / non-Vercel:        <projectRoot>/data/orders.json (gitignored)
//  - On Vercel without Upstash:  /tmp/enisi-orders.json (ephemeral but
//    survives same-instance reuse so refreshes don't lose orders)
function pickJsonPath(): string | null {
  if (hasUpstash) return null;
  try {
    if (process.env.VERCEL) {
      return path.join(os.tmpdir(), "enisi-orders.json");
    }
    const dir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, "orders.json");
  } catch {
    return null;
  }
}
const JSON_PATH = pickJsonPath();

type GlobalState = {
  mem?: Map<string, Order>;
  bus?: EventEmitter;
  jsonLoaded?: boolean;
  saveTimer?: ReturnType<typeof setTimeout> | null;
};
const g = globalThis as unknown as GlobalState;
if (!g.mem) g.mem = new Map<string, Order>();
if (!g.bus) {
  g.bus = new EventEmitter();
  g.bus.setMaxListeners(0);
}
const mem = g.mem;
export const bus = g.bus;

// ── JSON file helpers ───────────────────────────────────────────────────────
function loadFromDisk() {
  if (g.jsonLoaded || !JSON_PATH) return;
  g.jsonLoaded = true;
  try {
    if (!fs.existsSync(JSON_PATH)) return;
    const raw = fs.readFileSync(JSON_PATH, "utf8");
    const parsed = JSON.parse(raw) as Order[];
    if (Array.isArray(parsed)) {
      for (const o of parsed) {
        if (o && typeof o.id === "string") mem.set(o.id, o);
      }
    }
  } catch {
    /* corrupted file → ignore, start fresh */
  }
}

function scheduleSave() {
  if (!JSON_PATH) return;
  if (g.saveTimer) clearTimeout(g.saveTimer);
  g.saveTimer = setTimeout(() => {
    g.saveTimer = null;
    try {
      const data = JSON.stringify(Array.from(mem.values()));
      // Atomic write: write to temp then rename, so refreshes never see
      // a half-written file.
      const tmp = `${JSON_PATH}.tmp`;
      fs.writeFileSync(tmp, data, "utf8");
      fs.renameSync(tmp, JSON_PATH);
    } catch {
      /* fs read-only or no permission → silently fall back to memory only */
    }
  }, 80);
}

// Initial load on first import
loadFromDisk();

// ── Public API ──────────────────────────────────────────────────────────────
export async function addOrder(order: Order): Promise<void> {
  if (redis) {
    await redis.hset(HASH_KEY, { [order.id]: JSON.stringify(order) });
  } else {
    mem.set(order.id, order);
    scheduleSave();
  }
  bus.emit("change", { type: "add", order });
}

export async function listOrders(): Promise<Order[]> {
  let orders: Order[] = [];
  if (redis) {
    const raw = (await redis.hvals(HASH_KEY)) as unknown[];
    orders = raw
      .map((v) => {
        if (typeof v === "string") {
          try { return JSON.parse(v) as Order; } catch { return null; }
        }
        return v as Order;
      })
      .filter((x): x is Order => x !== null);
  } else {
    orders = Array.from(mem.values());
  }
  orders.sort((a, b) => a.createdAt - b.createdAt);
  return orders;
}

export async function removeOrder(id: string): Promise<boolean> {
  let removed = false;
  if (redis) {
    const n = await redis.hdel(HASH_KEY, id);
    removed = n > 0;
  } else {
    removed = mem.delete(id);
    if (removed) scheduleSave();
  }
  if (removed) bus.emit("change", { type: "remove", id });
  return removed;
}

export const usingRedis = hasUpstash;
export const usingJsonFile = !hasUpstash && JSON_PATH !== null;

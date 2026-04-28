import { Redis as UpstashRedis } from "@upstash/redis";
import { createClient } from "redis";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Order } from "./types";

const HASH_KEY = "enisi:orders";

// ── Storage backends ────────────────────────────────────────────────────────
// Priority: Upstash Redis (prod) → JSON file (dev / writable serverless tmp)
// → in-memory only.

// Vercel/Upstash can expose REST credentials under different names. Pick a
// complete URL/token pair instead of mixing a URL from one integration with a
// token from another.
const REDIS_ENV_CANDIDATES = [
  {
    source: "vercel-kv",
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  },
  {
    source: "upstash-redis",
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  },
  {
    source: "redis-rest",
    url: process.env.REDIS_REST_API_URL,
    token: process.env.REDIS_REST_API_TOKEN,
  },
] as const;

type RedisConfig = {
  source: string;
  url: string;
  token: string;
};

const redisConfig = REDIS_ENV_CANDIDATES.reduce<RedisConfig | null>(
  (found, candidate) =>
    found ??
    (candidate.url && candidate.token
      ? {
          source: candidate.source,
          url: candidate.url,
          token: candidate.token,
        }
      : null),
  null,
);

const TCP_REDIS_URL = process.env.REDIS_URL ?? "";

const hasUpstash = redisConfig !== null;
const hasTcpRedis = !hasUpstash && TCP_REDIS_URL.length > 0;

const upstashRedis = redisConfig
  ? new UpstashRedis({ url: redisConfig.url, token: redisConfig.token })
  : null;

// JSON file location:
//  - In dev / non-Vercel:        <projectRoot>/data/orders.json (gitignored)
//  - On Vercel without Upstash:  /tmp/enisi-orders.json (ephemeral but
//    survives same-instance reuse so refreshes don't lose orders)
function pickJsonPath(): string | null {
  if (hasUpstash || hasTcpRedis) return null;
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
  tcpRedis?: ReturnType<typeof createClient>;
  tcpRedisConnect?: Promise<ReturnType<typeof createClient>>;
};
const g = globalThis as unknown as GlobalState;
if (!g.mem) g.mem = new Map<string, Order>();
if (!g.bus) {
  g.bus = new EventEmitter();
  g.bus.setMaxListeners(0);
}
const mem = g.mem;
export const bus = g.bus;

async function getTcpRedis() {
  if (!TCP_REDIS_URL) {
    throw new Error("REDIS_URL is missing");
  }
  if (g.tcpRedis?.isOpen) {
    return g.tcpRedis;
  }
  if (g.tcpRedisConnect) {
    return g.tcpRedisConnect;
  }

  const client = createClient({ url: TCP_REDIS_URL });
  client.on("error", (error) => {
    console.error("Redis connection error", error);
  });

  g.tcpRedis = client;
  g.tcpRedisConnect = client
    .connect()
    .then(() => client)
    .catch((error) => {
      g.tcpRedis = undefined;
      g.tcpRedisConnect = undefined;
      throw error;
    });

  return g.tcpRedisConnect;
}

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
  if (upstashRedis) {
    await upstashRedis.hset(HASH_KEY, { [order.id]: JSON.stringify(order) });
  } else if (hasTcpRedis) {
    const redis = await getTcpRedis();
    await redis.hSet(HASH_KEY, order.id, JSON.stringify(order));
  } else {
    mem.set(order.id, order);
    scheduleSave();
  }
  bus.emit("change", { type: "add", order });
}

export async function listOrders(): Promise<Order[]> {
  let orders: Order[] = [];
  if (upstashRedis) {
    const raw = (await upstashRedis.hvals(HASH_KEY)) as unknown[];
    orders = raw
      .map((v) => {
        if (typeof v === "string") {
          try { return JSON.parse(v) as Order; } catch { return null; }
        }
        return v as Order;
      })
      .filter((x): x is Order => x !== null);
  } else if (hasTcpRedis) {
    const redis = await getTcpRedis();
    const raw = await redis.hVals(HASH_KEY);
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
  if (upstashRedis) {
    const n = await upstashRedis.hdel(HASH_KEY, id);
    removed = n > 0;
  } else if (hasTcpRedis) {
    const redis = await getTcpRedis();
    const n = await redis.hDel(HASH_KEY, id);
    removed = n > 0;
  } else {
    removed = mem.delete(id);
    if (removed) scheduleSave();
  }
  if (removed) bus.emit("change", { type: "remove", id });
  return removed;
}

export const usingRedis = hasUpstash || hasTcpRedis;
export const usingJsonFile = !usingRedis && JSON_PATH !== null;
export const redisEnvSource = redisConfig?.source ?? (hasTcpRedis ? "redis-url" : null);
export const storageBackend = usingRedis
  ? hasTcpRedis
    ? "redis-url"
    : "upstash-redis"
  : usingJsonFile
  ? "json-file"
  : "memory-only";

export function getStorageDiagnostics() {
  return {
    storage: storageBackend,
    redisEnvSource,
    env: {
      hasKvUrl: !!process.env.KV_REST_API_URL,
      hasKvToken: !!process.env.KV_REST_API_TOKEN,
      hasUpstashUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasUpstashToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      hasRedisRestUrl: !!process.env.REDIS_REST_API_URL,
      hasRedisRestToken: !!process.env.REDIS_REST_API_TOKEN,
      hasRedisUrl: !!process.env.REDIS_URL,
      isVercel: !!process.env.VERCEL,
    },
  };
}

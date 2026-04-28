"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Wifi,
  WifiOff,
  Check,
  Coffee,
  Clock,
  Loader2,
  Radio,
} from "lucide-react";
import type { Order } from "@/lib/types";

export default function BanakuPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [now, setNow] = useState(Date.now());
  const [soundOn, setSoundOn] = useState(true);
  const [connected, setConnected] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  // Real-time stream via Server-Sent Events.
  // EventSource auto-reconnects on disconnect, so we only need to manage cleanup.
  useEffect(() => {
    let es: EventSource | null = null;
    let stopped = false;
    let reopenTimer: ReturnType<typeof setTimeout> | null = null;

    function applyOrders(incoming: Order[]) {
      const incomingIds = new Set(incoming.map((o) => o.id));
      if (!firstLoad.current) {
        let hasNew = false;
        for (const o of incoming) {
          if (!knownIds.current.has(o.id)) hasNew = true;
        }
        if (hasNew && soundRef.current) playDing();
      }
      knownIds.current = incomingIds;
      firstLoad.current = false;

      setOrders(incoming);
      setDoneIds((prev) => {
        const next = new Set<string>();
        for (const id of prev) if (incomingIds.has(id)) next.add(id);
        return next;
      });
    }

    function open() {
      if (stopped) return;
      es = new EventSource("/api/stream");

      es.addEventListener("hello", () => setConnected(true));
      es.addEventListener("orders", (ev: MessageEvent) => {
        try {
          const { orders: incoming } = JSON.parse(ev.data) as {
            orders: Order[];
          };
          applyOrders(incoming);
        } catch {
          /* ignore */
        }
      });
      es.addEventListener("bye", () => {
        // Server is rotating connection — close cleanly, reopen immediately.
        es?.close();
        if (!stopped) open();
      });
      es.onopen = () => setConnected(true);
      es.onerror = () => {
        setConnected(false);
        es?.close();
        // Browser EventSource will normally reconnect on its own, but on some
        // server-close conditions it doesn't. Force reopen after a short delay.
        if (!stopped) {
          reopenTimer = setTimeout(open, 1000);
        }
      };
    }

    open();
    return () => {
      stopped = true;
      if (reopenTimer) clearTimeout(reopenTimer);
      es?.close();
    };
  }, []);

  function playDing() {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      const t0 = ctx.currentTime;
      [880, 1320].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        const start = t0 + i * 0.12;
        const end = start + 0.18;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, end);
        o.connect(g).connect(ctx.destination);
        o.start(start);
        o.stop(end + 0.02);
      });
    } catch {
      /* ignore */
    }
  }

  async function markDone(id: string) {
    setDoneIds((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/order/${id}/done`, { method: "POST" });
      // SSE will push the updated list; we also optimistically remove
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch {
      setDoneIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  function relTime(ts: number) {
    const sec = Math.max(0, Math.floor((now - ts) / 1000));
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    return `${min}min`;
  }

  function urgencyClass(ts: number) {
    const sec = Math.floor((now - ts) / 1000);
    if (sec >= 300) return "border-red-500/60 shadow-[0_0_24px_-8px_rgba(239,68,68,0.5)]";
    if (sec >= 120) return "border-amber-500/50";
    return "";
  }

  return (
    <main className="min-h-dvh">
      <header className="sticky top-0 z-10 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[color:var(--color-border)] px-5 py-3.5 flex items-center gap-4 flex-wrap">
        <Image
          src="/enisi-logo.png"
          alt="ENISI"
          width={953}
          height={387}
          className="h-11 w-auto"
          priority
        />
        <div className="border-l border-[color:var(--color-border)] h-10 mx-1" />
        <div>
          <div className="text-[color:var(--color-gold)] tracking-[0.3em] text-[10px] font-bold">
            BANAKU
          </div>
          <h1 className="text-xl font-extrabold leading-tight flex items-center gap-2">
            Porositë aktive
            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-gradient-to-br from-[color:var(--color-gold-light)] to-[color:var(--color-gold-dark)] text-black text-sm tabular-nums">
              {orders.length}
            </span>
          </h1>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setSoundOn((s) => !s)}
          className={
            "card rounded-xl w-11 h-11 flex items-center justify-center transition-colors " +
            (soundOn
              ? "border-[color:var(--color-gold)]/50 text-[color:var(--color-gold)]"
              : "opacity-60 text-[color:var(--color-muted)]")
          }
          title={soundOn ? "Tingulli i ndezur" : "Tingulli i fikur"}
          aria-label="Sound toggle"
        >
          {soundOn ? <Bell className="w-5 h-5" strokeWidth={2} /> : <BellOff className="w-5 h-5" strokeWidth={2} />}
        </button>
        <div
          className={
            "flex items-center gap-2 text-xs px-3.5 h-11 rounded-xl card font-semibold " +
            (connected ? "" : "border-red-500/50")
          }
          title={connected ? "Stream live (push real-time)" : "Lidhja po rifillon..."}
        >
          {connected ? (
            <>
              <Radio className="w-4 h-4 text-[color:var(--color-success)] animate-pulse" strokeWidth={2.5} />
              <Wifi className="w-4 h-4 text-[color:var(--color-success)]" strokeWidth={2.5} />
              <span className="text-[color:var(--color-success)]">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-400" strokeWidth={2.5} />
              <span className="text-red-400">Po rilidhet…</span>
            </>
          )}
        </div>
      </header>

      <section className="p-5">
        {orders.length === 0 ? (
          <div className="text-center py-24 text-[color:var(--color-muted)]">
            <div className="inline-flex w-20 h-20 rounded-full items-center justify-center mb-5 bg-gradient-to-br from-[color:var(--color-gold-light)]/15 to-[color:var(--color-gold-dark)]/5 border border-[color:var(--color-gold)]/20">
              <Coffee className="w-10 h-10 text-[color:var(--color-gold)]/70" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-semibold">Asnjë porosi për momentin</p>
            <p className="text-xs mt-2 flex items-center justify-center gap-1.5">
              {connected ? (
                <>
                  <Radio className="w-3 h-3 animate-pulse text-[color:var(--color-success)]" strokeWidth={2.5} />
                  Stream live i lidhur
                </>
              ) : (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} />
                  Po lidhet…
                </>
              )}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((o) => {
              const done = doneIds.has(o.id);
              return (
                <li
                  key={o.id}
                  className={
                    "card rounded-2xl p-5 fade-in pulse-new flex flex-col gap-4 transition-opacity " +
                    urgencyClass(o.createdAt) +
                    (done ? " opacity-40" : "")
                  }
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-muted)] font-bold">
                        Tavolina
                      </div>
                      <div className="text-5xl font-extrabold text-[color:var(--color-gold)] leading-none mt-1">
                        {o.table}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[color:var(--color-muted)] font-semibold">
                      <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                      {relTime(o.createdAt)}
                    </div>
                  </div>

                  <ul className="flex flex-col gap-2 text-base">
                    {o.items.map((it) => (
                      <li
                        key={it.id}
                        className="flex justify-between gap-2"
                      >
                        <span className="font-semibold">{it.name}</span>
                        <span className="text-[color:var(--color-gold)] font-bold tabular-nums">
                          ×{it.qty}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => markDone(o.id)}
                    disabled={done}
                    className="btn-gold w-full h-14 rounded-2xl text-base font-extrabold flex items-center justify-center gap-2"
                  >
                    {done ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} />
                        Duke u dërguar…
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" strokeWidth={3} />
                        E DËRGUAR
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  CupSoda,
  Beer,
  Martini,
  Minus,
  Plus,
  Check,
  ScanLine,
  ArrowRight,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";
import { MENU, type Category } from "@/lib/menu";

type Cart = Record<string, number>;

const SECTION_META: {
  key: Category;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { key: "pijet", label: "Pijet", Icon: CupSoda },
  { key: "birra", label: "Birra", Icon: Beer },
  { key: "koktej", label: "Koktej", Icon: Martini },
];

export default function ClientApp({ tableNum }: { tableNum: number | null }) {
  const validTable = tableNum !== null;

  const [section, setSection] = useState<Category | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [sending, setSending] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const totalQty = useMemo(
    () => Object.values(cart).reduce((s, q) => s + q, 0),
    [cart],
  );

  function inc(id: string) {
    setCart((c) => ({ ...c, [id]: Math.min(99, (c[id] ?? 0) + 1) }));
  }
  function dec(id: string) {
    setCart((c) => {
      const next = (c[id] ?? 0) - 1;
      const copy = { ...c };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  async function sendOrder() {
    if (!validTable || totalQty === 0 || sending) return;
    setSending(true);
    setErrMsg(null);
    try {
      const items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: tableNum, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Gabim");
      setCart({});
      setSection(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2400);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([60, 40, 60]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gabim, provo prap";
      setErrMsg(msg);
      setTimeout(() => setErrMsg(null), 3000);
    } finally {
      setSending(false);
    }
  }

  if (!validTable) {
    return (
      <main className="min-h-dvh hero-bg flex items-center justify-center px-6">
        <div className="card rounded-3xl p-10 max-w-sm text-center fade-in">
          <Image
            src="/enisi-logo.png"
            alt="ENISI"
            width={953}
            height={387}
            className="w-44 h-auto mx-auto mb-6 opacity-95"
            priority
          />
          <ScanLine className="w-14 h-14 mx-auto mb-4 text-[color:var(--color-gold)]" strokeWidth={1.5} />
          <h1 className="text-xl font-bold mb-2">Skano QR-në</h1>
          <p className="text-[color:var(--color-muted)] text-sm leading-relaxed">
            Kjo faqe hapet duke skanuar QR code-in në tavolinën tuaj.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh hero-bg flex flex-col max-w-[480px] mx-auto pb-36 relative">
      {/* Hero header */}
      <header className="px-6 pt-7 pb-4 text-center">
        <Image
          src="/enisi-logo.png"
          alt="ENISI Restaurant Tenda"
          width={953}
          height={387}
          className="w-40 h-auto mx-auto drop-shadow-[0_4px_24px_rgba(212,165,116,0.25)]"
          priority
        />
        <div className="divider-gold my-4 mx-8" />
        <div className="inline-flex items-center gap-2 card rounded-full px-4 py-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[color:var(--color-gold)]" strokeWidth={2.5} />
          <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
            Tavolina
          </span>
          <span className="text-base font-extrabold text-[color:var(--color-gold)]">
            {tableNum}
          </span>
        </div>
      </header>

      {/* Tabs */}
      <nav className="sticky top-0 z-10 px-4 py-3 bg-[#0A0A0A]/85 backdrop-blur-md border-b border-[color:var(--color-border)]">
        <div className="grid grid-cols-3 gap-2">
          {SECTION_META.map(({ key, label, Icon }) => {
            const active = section === key;
            return (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={
                  "h-[68px] rounded-2xl font-bold transition-all flex flex-col items-center justify-center gap-1.5 " +
                  (active ? "tab-active" : "tab text-[color:var(--color-text)]")
                }
              >
                <Icon
                  className={
                    "w-6 h-6 " +
                    (active ? "text-black" : "text-[color:var(--color-gold)]")
                  }
                  strokeWidth={2}
                />
                <span className="text-[10px] uppercase tracking-[0.18em] font-bold">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Items */}
      <section className="flex-1 px-4 py-5">
        {!section && (
          <div className="text-center py-14 px-4 fade-in">
            <div className="inline-flex w-20 h-20 rounded-full items-center justify-center mb-5 bg-gradient-to-br from-[color:var(--color-gold-light)]/20 to-[color:var(--color-gold-dark)]/10 border border-[color:var(--color-gold)]/30">
              <Martini className="w-10 h-10 text-[color:var(--color-gold)]" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-bold mb-2">Mirë se erdhët</h2>
            <p className="text-[color:var(--color-muted)] text-sm leading-relaxed max-w-[280px] mx-auto">
              Zgjedh një kategori më lart për t&apos;u njohur me menun.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {SECTION_META.map(({ key, label, Icon }) => (
                <div
                  key={key}
                  className="card rounded-2xl py-4 flex flex-col items-center gap-2"
                >
                  <Icon className="w-6 h-6 text-[color:var(--color-gold)]" strokeWidth={1.75} />
                  <div className="text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] font-bold">
                    {MENU[key].length} {label.toLowerCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section && (
          <ul className="flex flex-col gap-3 fade-in">
            {MENU[section].map((item, idx) => {
              const qty = cart[item.id] ?? 0;
              return (
                <li
                  key={item.id}
                  style={{ animationDelay: `${idx * 28}ms` }}
                  className={
                    "rounded-2xl px-4 py-3.5 flex items-center gap-3 slide-up " +
                    (qty > 0 ? "card card-active" : "card")
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[15px] leading-tight">
                      {item.name}
                    </div>
                    {qty > 0 && (
                      <div className="text-[10px] uppercase tracking-widest text-[color:var(--color-gold)] mt-0.5 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" strokeWidth={3} />
                        {qty} në porosi
                      </div>
                    )}
                  </div>
                  {qty === 0 ? (
                    <button
                      onClick={() => inc(item.id)}
                      className="btn-gold rounded-xl px-4 h-11 text-sm font-bold flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" strokeWidth={3} />
                      Shto
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 pop-in">
                      <button
                        onClick={() => dec(item.id)}
                        aria-label="hiq"
                        className="qty-btn rounded-xl w-11 h-11 flex items-center justify-center"
                      >
                        <Minus className="w-5 h-5" strokeWidth={2.5} />
                      </button>
                      <div className="w-9 text-center font-extrabold text-lg tabular-nums">
                        {qty}
                      </div>
                      <button
                        onClick={() => inc(item.id)}
                        aria-label="shto"
                        className="qty-btn-plus rounded-xl w-11 h-11 flex items-center justify-center"
                      >
                        <Plus className="w-5 h-5" strokeWidth={3} />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Floating Order Button */}
      {totalQty > 0 && (
        <div className="fab-bar fixed bottom-0 left-0 right-0 z-20 px-4 pt-8 pb-5">
          <div className="max-w-[480px] mx-auto">
            <button
              onClick={sendOrder}
              disabled={sending}
              className="btn-gold w-full h-16 rounded-2xl text-base font-extrabold flex items-center justify-center gap-3 slide-up"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} />
                  Duke dërguar…
                </span>
              ) : (
                <>
                  <span className="tracking-wide">POROSIT</span>
                  <span className="bg-black/20 rounded-full px-3 py-1 text-xs font-bold tabular-nums">
                    {totalQty} {totalQty === 1 ? "artikull" : "artikuj"}
                  </span>
                  <ArrowRight className="w-5 h-5" strokeWidth={3} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success overlay */}
      {success && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-6 bg-black/70 backdrop-blur-md fade-in">
          <div className="card rounded-3xl p-8 max-w-sm w-full text-center pop-in border-[color:var(--color-gold)]/40">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-[color:var(--color-gold-light)] to-[color:var(--color-gold-dark)] flex items-center justify-center shadow-2xl">
              <Check className="w-11 h-11 text-black" strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-extrabold mb-2">Faleminderit!</h2>
            <p className="text-[color:var(--color-muted)] text-sm leading-relaxed mb-1">
              Porosia juaj mbërriti te banakjeri.
            </p>
            <p className="text-[color:var(--color-gold)] text-sm font-semibold">
              Tavolina {tableNum}
            </p>
          </div>
        </div>
      )}

      {/* Error toast */}
      {errMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 fade-in">
          <div className="card rounded-full px-5 py-3 shadow-2xl border-red-500/50 text-sm font-semibold text-red-400 flex items-center gap-2">
            <X className="w-4 h-4" strokeWidth={3} />
            {errMsg}
          </div>
        </div>
      )}
    </main>
  );
}

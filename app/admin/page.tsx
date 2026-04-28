"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Download,
  FileText,
  Loader2,
  ScanLine,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Globe,
  Pencil,
  Check,
  X,
  Bell,
} from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const [count, setCount] = useState(10);
  const [qrs, setQrs] = useState<string[]>([]);
  const [detectedOrigin, setDetectedOrigin] = useState("");
  const [origin, setOrigin] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [editingOrigin, setEditingOrigin] = useState(false);
  const [draftOrigin, setDraftOrigin] = useState("");
  const [allBusy, setAllBusy] = useState(false);
  const [busyTable, setBusyTable] = useState<number | null>(null);
  const [showPreviews, setShowPreviews] = useState(true);
  const [generating, setGenerating] = useState(true);

  // Detect origin from the current browser location once on mount
  useEffect(() => {
    const auto = window.location.origin;
    setDetectedOrigin(auto);
    setOrigin(auto);
    setDraftOrigin(auto);
    const params = new URLSearchParams(window.location.search);
    const n = Number(params.get("n"));
    if (Number.isInteger(n) && n >= 1 && n <= 99) setCount(n);
  }, []);

  const tables = useMemo(
    () => Array.from({ length: count }, (_, i) => i + 1),
    [count],
  );

  // Re-generate QR previews whenever tables, origin, or refresh tick change
  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    setGenerating(true);
    (async () => {
      const out: string[] = [];
      for (const t of tables) {
        const dataUrl = await QRCode.toDataURL(`${origin}/?t=${t}`, {
          errorCorrectionLevel: "H",
          margin: 1,
          width: 300,
          color: { dark: "#000000", light: "#ffffff" },
        });
        out.push(dataUrl);
      }
      if (!cancelled) {
        setQrs(out);
        setGenerating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tables, origin, refreshTick]);

  function refreshQrs() {
    setRefreshTick((x) => x + 1);
  }

  function saveOrigin() {
    let v = draftOrigin.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    v = v.replace(/\/+$/, "");
    setOrigin(v);
    setEditingOrigin(false);
  }

  function resetOrigin() {
    setOrigin(detectedOrigin);
    setDraftOrigin(detectedOrigin);
    setEditingOrigin(false);
  }

  async function downloadOne(table: number) {
    if (busyTable !== null) return;
    setBusyTable(table);
    try {
      const res = await fetch(`/api/menu-pdf?t=${table}&origin=${encodeURIComponent(origin)}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      triggerDownload(blob, `enisi-tavolina-${table}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Gabim gjatë gjenerimit të PDF-së.");
    } finally {
      setBusyTable(null);
    }
  }

  async function downloadAll() {
    if (allBusy) return;
    setAllBusy(true);
    try {
      const res = await fetch(`/api/menu-pdf?from=1&to=${count}&origin=${encodeURIComponent(origin)}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      triggerDownload(blob, `enisi-tavolinat-1-${count}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Gabim gjatë gjenerimit të PDF-së.");
    } finally {
      setAllBusy(false);
    }
  }

  return (
    <main className="min-h-dvh hero-bg">
      <header className="sticky top-0 z-10 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[color:var(--color-border)] px-5 py-4 flex items-center gap-4 flex-wrap">
        <Image
          src="/enisi-logo.png"
          alt="ENISI"
          width={953}
          height={387}
          className="h-12 w-auto"
          priority
        />
        <div className="border-l border-[color:var(--color-border)] h-10 mx-1" />
        <div>
          <div className="text-[color:var(--color-gold)] tracking-[0.3em] text-[10px] font-bold">
            ADMIN
          </div>
          <h1 className="text-xl font-extrabold leading-tight">
            Menutë me QR për tavolinat
          </h1>
        </div>
        <div className="flex-1" />
        <Link
          href="/banku"
          className="card rounded-xl px-4 h-11 text-sm font-bold flex items-center gap-2"
        >
          <Bell className="w-4 h-4 text-[color:var(--color-gold)]" strokeWidth={2.5} />
          Hap banakun
        </Link>
        <label className="flex items-center gap-3 text-sm card rounded-xl px-4 h-11">
          <span className="text-[color:var(--color-muted)] uppercase text-[10px] tracking-widest font-bold">
            Sa tavolina
          </span>
          <input
            type="number"
            min={1}
            max={99}
            value={count}
            onChange={(e) =>
              setCount(Math.max(1, Math.min(99, Number(e.target.value) || 1)))
            }
            className="bg-transparent w-14 text-center font-extrabold text-base outline-none"
          />
        </label>
        <button
          onClick={refreshQrs}
          disabled={generating}
          className="card rounded-xl w-11 h-11 flex items-center justify-center border-[color:var(--color-gold)]/40 text-[color:var(--color-gold)] disabled:opacity-50"
          title="Rifresko QR"
          aria-label="Rifresko QR"
        >
          <RefreshCw
            className={"w-5 h-5 " + (generating ? "animate-spin" : "")}
            strokeWidth={2.5}
          />
        </button>
        <button
          onClick={downloadAll}
          disabled={allBusy}
          className="btn-gold rounded-xl px-5 h-11 font-bold flex items-center gap-2"
        >
          {allBusy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
              Po gjeneron…
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" strokeWidth={2.5} />
              Shkarko PDF për të gjitha
            </>
          )}
        </button>
      </header>

      <section className="p-5 max-w-7xl mx-auto">
        {/* Domain card */}
        <div className="card rounded-2xl p-5 mb-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[color:var(--color-gold)]/15 border border-[color:var(--color-gold)]/30 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-[color:var(--color-gold)]" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-muted)] font-bold mb-1">
              Domain për QR-të
            </div>
            {!editingOrigin ? (
              <div className="flex items-center gap-2 flex-wrap">
                <code className="font-mono text-base font-bold text-[color:var(--color-gold)] break-all">
                  {origin || "…"}
                </code>
                <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-muted)] font-bold">
                  {origin === detectedOrigin ? "auto" : "manual"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  autoFocus
                  type="text"
                  value={draftOrigin}
                  onChange={(e) => setDraftOrigin(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveOrigin();
                    if (e.key === "Escape") setEditingOrigin(false);
                  }}
                  placeholder="https://enisi.app"
                  className="card rounded-xl px-3 h-10 font-mono text-sm font-bold flex-1 min-w-[280px] outline-none focus:border-[color:var(--color-gold)]/60"
                />
                <button
                  onClick={saveOrigin}
                  className="btn-gold rounded-xl px-3 h-10 text-xs font-bold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" strokeWidth={3} /> Ruaj
                </button>
                <button
                  onClick={() => {
                    setEditingOrigin(false);
                    setDraftOrigin(origin);
                  }}
                  className="card rounded-xl px-3 h-10 text-xs font-bold flex items-center gap-1.5"
                >
                  <X className="w-4 h-4" strokeWidth={3} /> Anulo
                </button>
              </div>
            )}
            <p className="text-xs text-[color:var(--color-muted)] mt-2 leading-relaxed">
              Ky është adresa që do të shkruhet brenda secilit QR. Klienti, kur
              skanon, hapet kjo adresë + numri i tavolinës.{" "}
              <strong className="text-[color:var(--color-text)]">Auto-zbulohet</strong>{" "}
              nga URL-ja aktuale e këtij admin-i — pra në Vercel do të jetë
              automatikisht domain-i juaj.
            </p>
          </div>
          {!editingOrigin && (
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={() => setEditingOrigin(true)}
                className="card rounded-xl px-3 h-9 text-xs font-bold flex items-center gap-1.5"
                title="Override manual"
              >
                <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
                Ndrysho
              </button>
              {origin !== detectedOrigin && (
                <button
                  onClick={resetOrigin}
                  className="card rounded-xl px-3 h-9 text-xs font-bold flex items-center gap-1.5 text-[color:var(--color-muted)]"
                >
                  <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Auto
                </button>
              )}
            </div>
          )}
        </div>

        {/* Info card */}
        <div className="card rounded-2xl p-5 mb-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[color:var(--color-gold)]/15 border border-[color:var(--color-gold)]/30 flex items-center justify-center shrink-0">
            <ScanLine className="w-5 h-5 text-[color:var(--color-gold)]" strokeWidth={2} />
          </div>
          <div className="flex-1 text-sm leading-relaxed">
            <div className="font-bold mb-1">
              Çdo PDF është menuja e ENISI me QR-në e tavolinës
            </div>
            <p className="text-[color:var(--color-muted)]">
              Klienti skanon QR-në → hapet menuja në telefon me numrin e duhur.
              Banakjeri sheh të njëjtin numër kur arrin porosia.{" "}
              <strong className="text-[color:var(--color-text)]">
                Shkarko PDF për të gjitha
              </strong>{" "}
              gjeneron një file me {count} faqe (një faqe për secilën tavolinë).
            </p>
          </div>
          <button
            onClick={() => setShowPreviews((s) => !s)}
            className="card rounded-xl px-4 h-10 text-xs font-bold flex items-center gap-2 shrink-0"
          >
            {showPreviews ? (
              <>
                <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
                Mbyll preview
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
                Shfaq preview
              </>
            )}
          </button>
        </div>

        {/* QR previews grid */}
        {showPreviews && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {tables.map((t, i) => {
              const busy = busyTable === t;
              return (
                <article
                  key={t}
                  className="card rounded-2xl p-4 flex flex-col items-center text-center gap-2 fade-in"
                >
                  <div className="w-full flex items-baseline justify-between mb-1">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-muted)] font-bold">
                      Tavolina
                    </div>
                    <div className="text-3xl font-extrabold leading-none text-[color:var(--color-gold)]">
                      {t}
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-xl">
                    {qrs[i] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrs[i]}
                        alt={`QR Tavolina ${t}`}
                        width={140}
                        height={140}
                        className="block"
                      />
                    ) : (
                      <div className="w-[140px] h-[140px] grid place-items-center text-black text-xs">
                        <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2} />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => downloadOne(t)}
                    disabled={busy || allBusy}
                    className="btn-gold mt-1 w-full rounded-xl h-10 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} />
                        PDF…
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
                        PDF Tav. {t}
                      </>
                    )}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

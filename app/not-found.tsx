import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="card rounded-2xl p-8 max-w-sm text-center">
        <div className="text-5xl mb-3">🤔</div>
        <h1 className="text-xl font-bold mb-2">Faqja nuk u gjet</h1>
        <p className="text-[color:var(--color-muted)] text-sm mb-5">
          Skano QR-në e tavolinës ose kthehu në fillim.
        </p>
        <Link
          href="/"
          className="btn-gold inline-block rounded-xl px-5 py-3 font-bold"
        >
          Kthehu
        </Link>
      </div>
    </main>
  );
}

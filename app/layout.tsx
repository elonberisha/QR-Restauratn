import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Only load the weights we actually use → smaller font payload (~3x smaller)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "ENISI Restaurant — Porosit",
  description: "Porosit pijet me skanim QR — ENISI Restaurant Tenda",
  // Prevent search engine indexing — this is a per-table ordering surface
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sq" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* High-priority asset hints — the logo is the first thing the customer sees */}
        <link
          rel="preload"
          as="image"
          href="/enisi-logo.png"
          fetchPriority="high"
        />
        {/* DNS / TLS warmup so the first POST is faster */}
        <link rel="dns-prefetch" href="/" />
      </head>
      <body className="min-h-full antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Generating up to 30 pages may take a few seconds on cold start
export const maxDuration = 60;

let cachedPdf: Buffer | null = null;
function loadMenuPdf(): Buffer {
  if (cachedPdf) return cachedPdf;
  const pdfPath = path.join(process.cwd(), "lib/assets/menu-enisi.pdf");
  cachedPdf = fs.readFileSync(pdfPath);
  return cachedPdf;
}

const GOLD = rgb(0.83, 0.647, 0.456); // #D4A574
const DARK_GOLD = rgb(0.627, 0.471, 0.271);
const TEXT_DARK = rgb(0.06, 0.06, 0.06);
const MUTED = rgb(0.42, 0.42, 0.42);
const WHITE = rgb(1, 1, 1);

async function generateQrPng(url: string): Promise<Uint8Array> {
  // Transparent background so the orange menu shows through.
  // High error correction so the QR remains scannable on the colored background.
  return await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 0,
    width: 480,
    color: { dark: "#000000FF", light: "#00000000" },
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tParam = url.searchParams.get("t");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const tables: number[] = [];
  if (tParam) {
    const t = Number(tParam);
    if (!Number.isInteger(t) || t < 1 || t > 99) {
      return NextResponse.json({ error: "Numër tavoline i pavlefshëm" }, { status: 400 });
    }
    tables.push(t);
  } else if (fromParam || toParam) {
    const from = Math.max(1, Math.min(99, Number(fromParam ?? 1)));
    const to = Math.max(from, Math.min(99, Number(toParam ?? from)));
    for (let i = from; i <= to; i++) tables.push(i);
  } else {
    return NextResponse.json(
      { error: "Specifiko ?t=N ose ?from=A&to=B" },
      { status: 400 },
    );
  }

  let menuBytes: Buffer;
  try {
    menuBytes = loadMenuPdf();
  } catch {
    return NextResponse.json(
      { error: "PDF-ja burimore nuk u gjet në server" },
      { status: 500 },
    );
  }

  const baseDoc = await PDFDocument.load(menuBytes);
  const finalDoc = await PDFDocument.create();
  const fontBold = await finalDoc.embedFont(StandardFonts.HelveticaBold);

  // Embed the menu page ONCE — shared across all output pages so file size
  // stays near the size of the source menu (≈13MB), regardless of how many
  // tables we generate.
  const [menuTemplate] = await finalDoc.embedPdf(baseDoc, [0]);
  const sourcePage = baseDoc.getPage(0);
  const { width, height } = sourcePage.getSize();

  // Public origin for the QR URL — the customer's phone uses this.
  // Priority: explicit ?origin= query param (admin override) → forwarded host
  // headers (Vercel) → request URL → env var.
  const originParam = url.searchParams.get("origin");
  const xfHost = req.headers.get("x-forwarded-host");
  const xfProto = req.headers.get("x-forwarded-proto");
  let fullOrigin =
    originParam?.trim() ||
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    (xfHost ? `${xfProto ?? "https"}://${xfHost}` : url.origin);
  // Normalise — strip trailing slash, prepend protocol if missing
  if (!/^https?:\/\//i.test(fullOrigin)) fullOrigin = `https://${fullOrigin}`;
  fullOrigin = fullOrigin.replace(/\/+$/, "");

  for (const table of tables) {
    const page = finalDoc.addPage([width, height]);
    page.drawPage(menuTemplate, { x: 0, y: 0, width, height });

    // Generate QR (transparent background)
    const qrUrl = `${fullOrigin}/?t=${table}`;
    const qrPng = await generateQrPng(qrUrl);
    const qrImage = await finalDoc.embedPng(qrPng);

    // Layout — directly on the orange menu, no card wrapper.
    // Positioned in the empty zone between "PANASHE" and the drink photos.
    const cellW = 165;
    const cellH = 150;
    const cellX = width * 0.07;
    const cellY = height * 0.215;
    const cx = cellX + cellW / 2;

    // Title row: "SKANO PER POROSI - N" — "N" is the table number,
    // placed directly after the title (same line). No "TAVOLINA" word.
    const titleText = "SKANO PER POROSI";
    const titleSize = 11;
    const numStr = String(table);
    const numSize = 18; // a bit bigger so it pops
    const gap = 8;

    const titleW = fontBold.widthOfTextAtSize(titleText, titleSize);
    const numW = fontBold.widthOfTextAtSize(numStr, numSize);
    const totalW = titleW + gap + numW;

    const titleY = cellY + cellH - 16;
    const titleX = cx - totalW / 2;

    page.drawText(titleText, {
      x: titleX,
      y: titleY,
      size: titleSize,
      font: fontBold,
      color: WHITE,
    });

    // Number drawn right after the title, slightly lower baseline so
    // the larger digits align visually with the title row.
    // White for high contrast against the orange menu background.
    page.drawText(numStr, {
      x: titleX + titleW + gap,
      y: titleY - 3,
      size: numSize,
      font: fontBold,
      color: WHITE,
    });

    // Thin gold divider under the title row
    page.drawRectangle({
      x: cellX + 24,
      y: titleY - 10,
      width: cellW - 48,
      height: 0.8,
      color: GOLD,
      opacity: 0.9,
    });

    // QR — black on transparent; sits directly on orange
    const qrSize = 110;
    page.drawImage(qrImage, {
      x: cx - qrSize / 2,
      y: titleY - 18 - qrSize,
      width: qrSize,
      height: qrSize,
    });
  }

  const out = await finalDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  const filename =
    tables.length === 1
      ? `enisi-tavolina-${tables[0]}.pdf`
      : `enisi-tavolinat-${tables[0]}-${tables[tables.length - 1]}.pdf`;

  return new NextResponse(out as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // PDFs are deterministic for a given (table, origin). Cache aggressively
      // on the CDN so re-downloads are instant.
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}

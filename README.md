# 🍹 ENISI QR — Restaurant Ordering

Sistem i thjeshtë për porosi pijesh me skanim QR për **ENISI Restaurant - Tenda**.

- **Klienti** skanon QR-në në tavolinë → zgjedh pijet → porosit
- **Banakjeri** sheh porositë në kohë reale → klikon "E dërguar" → zhduken
- **Admin** (ti) printon QR-të një herë nga `/print`

---

## 📁 Struktura

```
app/
├── page.tsx            → Klienti (mobile, /?t=<numri-tavolines>)
├── banaku/page.tsx     → Banakjeri (PC/tablet)
├── print/page.tsx      → Printim QR (admin)
└── api/                → 3 endpoint-e (order, orders, done)

lib/
├── menu.ts             → Menuja ENISI (e ngulitur, pa çmime)
├── store.ts            → Upstash Redis + fallback in-memory
└── types.ts            → Order, OrderItem
```

---

## 🚀 Run lokal

```bash
npm install
npm run dev
```

Hap:
- **Klienti:** http://localhost:3000/?t=1
- **Banakjeri:** http://localhost:3000/banaku
- **Print QR:** http://localhost:3000/print?n=10

> Pa env vars, përdor in-memory store — porositë humbasin nëse server restarton.
> Funksionon vetëm për testim lokal në një dev server të vetëm.

---

## ☁️ Deploy në Vercel (5 min)

1. **Push në GitHub:**
   ```bash
   git add . && git commit -m "Initial ENISI QR"
   git remote add origin <github-repo-url>
   git push -u origin main
   ```

2. **Vercel:**
   - https://vercel.com/new → Import nga GitHub repo → **Deploy** (1 click)

3. **Shto Upstash Redis (FALAS, e detyrueshme për prodhim):**
   - Te projekti në Vercel → **Storage** → **Create Database**
   - Zgjedh **Upstash → Redis** → **Continue** → **Create**
   - Vercel injekton automatikisht `KV_REST_API_URL` dhe `KV_REST_API_TOKEN`
   - **Redeploy** (1 click) për t'i aktivizuar

4. **Përdor:**
   - Hap `https://enisi-qr.vercel.app/print?n=10` → printo QR-të
   - Vendos QR-të në tavolina
   - Banakjeri hap `https://enisi-qr.vercel.app/banaku` në PC/tablet

---

## 🎨 Brand

- Background: `#0F0F0F` (dark)
- Accent: `#D4A574 → #E8C39E` (gold gradient)
- Font: Inter

---

## ⚙️ Stack

- **Next.js 16** (App Router)
- **Tailwind CSS v4**
- **Upstash Redis** (storage për porositë)
- **qrcode** (gjenerim QR client-side)

Pa login, pa databazë SQL, pa WebSocket — sa më e thjeshtë.

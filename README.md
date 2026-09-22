# Revenue Growth OS

An AI-powered revenue intelligence tool for consumer brands: format raw
Sales/SAP/POS exports into a clean Master DB, filter by region/channel/
category/vendor/period, generate 9 analysis views (Revenue Analytics, SKU
Intelligence, Marketing Efficiency, Customer Intel, Supply Chain, Pricing &
Discount, Shelf & Packaging, Competition, Market Expansion), and export a
board-ready PPTX deck.

Built independently as a functional recreation based on the public UI/flow of
`revenue-growth-model-in-cpg.vercel.app`. It is not the original codebase and
is not affiliated with that site's author — treat it as a from-scratch
rebuild, not a copy of their source.

## Stack

- **Next.js 16** (App Router, React 19) — frontend + backend in one project
- **API routes** (`app/api/*`) — file parsing, metric derivation, PPTX export
- **xlsx (SheetJS)** — reads/writes `.xlsx` / `.csv`
- **pptxgenjs** — generates the exported deck
- **recharts v3** — charts in the live preview
- **Tailwind CSS** — styling

Requires **Node.js 20.9+** (Next 16 minimum).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the app loads with a seeded 4,500-row sample
CPG dataset so every view works immediately with no upload required.

## How the pipeline works

1. **Step 1 — Format**: upload a raw export → `POST /api/format` auto-maps
   columns, backfills dates, computes derived metrics (CLV, AOV, Profit%,
   ROAS, CAC, inventory pressure, expiry risk, churn risk, vendor
   dependency), and returns a `Master_DB.xlsx` download.
2. **Step 2 — Upload + Filter**: drop an existing Master DB (sheet named
   `Master DB`) and set filters.
3. **Step 3 — Generate + Export**: `Generate & Preview` runs the 9 analysis
   views client-side; `Export PPTX Deck` calls `POST /api/export-pptx` to
   build the deck server-side.

All core logic lives in `lib/` (`sampleData.ts`, `masterDb.ts`,
`analysis.ts`) and is shared by both the client UI and the API routes.

## Deploy to Vercel

**Option A — Vercel CLI (no GitHub needed)**
```bash
npm install -g vercel
cd revenue-growth-os
vercel        # follow prompts, creates a preview deployment
vercel --prod # promotes to your production URL
```

**Option B — GitHub + Vercel dashboard**
1. Push this folder to a new GitHub repo.
2. Go to https://vercel.com/new, import the repo.
3. Framework preset auto-detects **Next.js** — no config needed.
4. Click **Deploy**. No environment variables are required.

Either way you'll get a `*.vercel.app` URL in a couple of minutes.

## Security notes

- Now on **Next 16.3.0** + **React 19** + **recharts 3**, which closes every
  Next/PostCSS advisory `npm audit` was flagging. I upgraded this without
  being able to run `npm install`/`npm run build` myself (no network in my
  sandbox) — the App Router code here doesn't touch any of the APIs that
  changed across Next 15/16 (no dynamic route params, no `cookies()`/
  `headers()`, no middleware, no `next/image`), so it should build clean,
  but **run `npm run build` locally before deploying** and paste me any
  error if one comes up — most likely spot for a snag is a recharts v3 prop
  rename in `components/ViewChart.tsx`.
- `xlsx` (SheetJS) still has two open advisories (prototype pollution, ReDoS)
  with **no upstream fix**. Risk here is low since the app only parses files
  the same user uploads (never a remote/untrusted file server-side), but if
  you want it gone entirely, swap `parseRawWorkbook` / `exportMasterWorkbook`
  in `lib/masterDb.ts` to `exceljs` instead — same job, different API, no
  advisory currently open against it.

## Notes

- No database — the app is stateless; sample data is generated
  deterministically in the browser/server on each load.
- No auth/env vars needed for this build.
- If you want it to *actually* forecast (vs. compute descriptive metrics),
  that's a separate ML component — see the discussion in chat about the
  Walmart sales-forecasting files, which use a different schema than this
  app expects.

# Revenue Growth OS

Revenue analytics and data governance platform for consumer brands. Upload a raw Sales / SAP / POS export, validate it, and turn it into a 9-view analysis and a PPTX deck.

Live: https://revenue-growth-os.vercel.app

## Features

**Analytics**
- Formats raw exports into a clean Master DB (CLV, AOV, profit %, ROAS, CAC, inventory, expiry and churn risk)
- 9 filterable views: Revenue, SKU, Marketing, Customer, Supply Chain, Pricing, Shelf, Competition, Expansion
- Board-ready PPTX export

**Data quality and governance** (`/governance`)
- 13 validation rules (errors and warnings) with data quality KPIs
- Exception management: severity, status, resolution notes
- Reconciliation of two sources by transaction ID (missing records, amount mismatches, duplicates)
- Audit trail, data dictionary and lineage
- Results stored in PostgreSQL (Supabase) via Prisma

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS, Recharts, SheetJS (xlsx), pptxgenjs, Prisma, PostgreSQL (Supabase)

## Run locally

```bash
npm install
cp .env.example .env     # add your Supabase connection strings
npx prisma db push       # create the tables
npm run dev
```

Open http://localhost:3000. Without `DATABASE_URL` the app still runs, but governance results last for the browser session only.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection (port 6543), used at runtime |
| `DIRECT_URL` | Direct connection (port 5432), used by `prisma db push` |

## Limitations

- Analytics are descriptive, with no forecasting model.
- Marketing spend, ROAS and margin use fixed channel and cost assumptions, because the input has no real ad-spend or cost data.
- "YoY" compares the first half of the dataset with the second half.
- Referential integrity checks (product or customer must exist) are not implemented.

# TaskLocal — Trust & Safety

Frontend dashboard for the TaskLocal Trust & Safety product. This app reads from the shared Supabase Postgres database used by all four class products.

## What this app will do

- Surface flagged marketplace reviews and bookings that need attention
- Show trends in flags, review volume, and sentiment
- Extract natural language themes from reciprocal review comments

This repo currently contains **scaffolding only**: typed Supabase access, shared schema types, and placeholder dashboard routes with live read queries.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the env template and add your publishable key:

```bash
cp .env.local.example .env.local
```

Set these values in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` — already prefilled in the example file
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — your Supabase publishable (anon) key

Do **not** use the service role key or database password in this app.

3. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Shared database rules

- **Do not create, alter, or drop tables.** The schema is shared with other products.
- Table names are capitalized: `Provider`, `Listing`, `Customer`, `Booking`, `Review`.
- Foreign keys and enum-like fields are plain text — validate values in app code.
- Generate new IDs with short prefixes: `prv_`, `lst_`, `cus_`, `bkg_`, `rev_`.

## Project structure

```
src/
  app/                  # Next.js routes
  components/           # UI and layout components
  lib/
    supabase/           # Supabase client wrappers
    types/              # Shared schema TypeScript types
    constants/          # Enum value lists
    utils/              # ID generation helpers
    queries/            # Read-only data access helpers
```

## Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — run production server
- `npm run lint` — ESLint

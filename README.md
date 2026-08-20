# TaskLocal — Trust & Safety

Internal moderation dashboard for the TaskLocal Trust & Safety product (Product D, Sheet 04 MVP). This app reads from and updates the shared Supabase Postgres database used across TaskLocal marketplace products.

> **Scope Note**: This repository covers **Product D (Trust & Safety Dashboard)** only. Marketplace products A (Provider), B (Customer), and C (Chatbot) are handled in separate services.

## Working MVP Features

This repo was built from initial scaffolding into a fully working Trust & Safety moderation dashboard MVP:

- **Overview Dashboard (`/`)**: Displays live review stats (total reviews, flagged reviews, unhandled flags) alongside live database connection status.
- **Flagged Queue (`/flagged`)**: Displays open, unhandled review flags (`handled = false`) sorted oldest-first by creation timestamp.
  - **Reviewer Role Filter**: Tabs to filter queue by `All`, `Customer` (reviews written by customers), or `Provider` (reviews written by providers).
  - **Repeat-Flag Badge**: Calculates and displays the total count of open flags against the reviewed party (provider or customer) to surface repeat issues.
- **Review Detail (`/flagged/[id]`)**: Comprehensive detail view assembling the full database relation chain (`Review` → `Booking` → `Listing`) to provide full context before resolving issues.
- **Resolve Action**: Inline button on queue rows and detail page executing the `resolveReview` mutation to mark flags as handled (`handled = true`) and revalidate views.

### Non-MVP Placeholders
- **`/trends`**: Placeholder page for future flag trends, review volume, and sentiment analytics.
- **`/reviews`**: Placeholder page for future natural language processing (NLP) and theme extraction on reciprocal review comments.

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

## Shared Database Rules

- **Do not create, alter, or drop tables.** The schema is shared with other products.
- Table names are capitalized: `Provider`, `Listing`, `Customer`, `Booking`, `Review`.
- Foreign keys and enum-like fields are plain text — validate values in app code.
- Generate new IDs with short prefixes: `prv_`, `lst_`, `cus_`, `bkg_`, `rev_`.

## Project Structure

```
src/
  app/                  # Next.js routes (/flagged, /flagged/[id], /trends, /reviews)
    flagged/            # Flagged queue table, tabs, and detail pages
      actions.ts        # Server actions for review resolution
  components/           # UI, layout, and flagged queue components
  lib/
    supabase/           # Supabase client wrappers
    types/              # Shared schema TypeScript types
    constants/          # Enum value lists
    utils/              # ID generation helpers
    queries/            # Data access queries & mutations (reviews, bookings, listings)
```

## Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — run production server
- `npm run lint` — ESLint
- `npm test` — run offline unit tests (Vitest; no Supabase or `.env.local` required)

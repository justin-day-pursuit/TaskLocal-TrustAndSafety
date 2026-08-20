# TaskLocal — Trust & Safety

Internal moderation dashboard for the TaskLocal Trust & Safety product (Product D, Sheet 04 MVP). This app reads from and updates the shared Supabase Postgres database used across TaskLocal marketplace products.

> **Scope Note**: This repository covers **Product D (Trust & Safety Dashboard)** only. Marketplace products A (Provider), B (Customer), and C (Chatbot) are handled in separate services.

## Working features

Moderation dashboard for Product D, including the Reviews Console slice (shipped on `main` via [#8](https://github.com/justin-day-pursuit/TaskLocal-TrustAndSafety/pull/8)):

- **Overview Dashboard (`/`)**: Live review stats (total, flagged, unhandled) plus connection status. Stat cards link to `/reviews`, `/reviews?flag=true`, and `/action-needed`.
- **Action needed (`/action-needed`)**: Open, unhandled review flags (`flag = true`, `handled = false`), oldest-first. Role tabs (All / Customer / Provider), repeat-flag badges, inline Resolve, click-to-expand Review + Booking, pagination. Detail at `/action-needed/[id]`. `/flagged` and `/flagged/:id` permanently redirect here (308).
- **Reviews catalog (`/reviews`)**: All reviews with search, filter, sort, date windows (UTC), and pagination. Expandable Review + Booking rows. No inline Resolve; flagged+unhandled rows can link to Action needed.
- **Resolve**: Sets `handled = true` only. List/panel Resolve keeps the current query string; detail returns to the queue URL including `role`/`page`. Booking fetch failures show a banner and still render the review list.

Spec: [docs/PRD.md](docs/PRD.md).

### Placeholders
- **`/trends`**: Future flag trends, review volume, and sentiment analytics.
- **NLP / review themes**: Parked. `/reviews` is the all-reviews catalog, not an NLP page.

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
  app/                  # Next.js routes (/action-needed, /reviews, /trends)
    action-needed/      # Queue table, tabs, detail, resolve action
    reviews/            # All-reviews catalog
  components/           # UI, layout, queue, and catalog components
  lib/
    supabase/           # Supabase client wrappers
    types/              # Shared schema TypeScript types
    constants/          # Enum value lists
    utils/              # ID generation helpers
    queries/            # Data access queries & mutations (reviews, bookings, listings)
    reviews/            # URL params, dates, pagination, list presentation
```

## Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — run production server
- `npm run lint` — ESLint
- `npm test` — run offline unit tests (Vitest; no Supabase or `.env.local` required)

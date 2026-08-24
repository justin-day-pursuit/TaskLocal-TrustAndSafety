# TaskLocal — Trust & Safety

Internal moderation dashboard for the TaskLocal Trust & Safety product (Product D, Sheet 04 MVP). This app reads from and updates the shared Supabase Postgres database used across TaskLocal marketplace products.

> **Scope Note**: This repository covers **Product D (Trust & Safety Dashboard)** only. Marketplace products A (Provider), B (Customer), and C (Chatbot) are handled in separate services.

## For stakeholders

This product is the **Trust & Safety desk** for the TaskLocal marketplace. Customer and provider reviews sometimes get flagged as a problem. Moderators use this dashboard to see those flags, understand the booking behind them, and mark the ones they have already dealt with.

### What it does

- **Dashboard** — a snapshot of how many reviews exist, how many are flagged, and how many flags still need a person.
- **Action needed** — the work queue. It shows only flagged reviews that have not been handled yet, oldest first, so nothing sits unnoticed.
- **Reviews** — the full catalog. Search by review or booking ID, filter (including flagged vs not flagged), sort, and page through every review. Use this when you are looking something up, not when you are clearing the queue.
- **Resolve** — the only action a moderator takes here. It marks a flagged item as handled. It does not delete the review or change the booking.
- **Trends** — on-demand analysis of stripped reviews: flag trends, sentiment, keywords, and an action plan. Chart numbers are computed locally; explanations come from Gemini.

Reviews that are not flagged cannot be marked handled. On the Reviews page, choosing **Not flagged** turns off the Handled filter for that reason.

### How it works

The app talks to the same shared TaskLocal database as the rest of the marketplace. It does not create its own copy of reviews or bookings. Opening a row shows the review text plus the related booking so a moderator can decide with context. Pagination and filters stay on the page; the review list scrolls in its own pane so the search bar does not disappear while you scan results.

Every database and API call has visible request states:

- **Loading** — a spinner and a description of the call in progress (for example, “Loading the reviews catalog…”).
- **Error** — a message that the call failed, with a short technical detail for staff.
- **Timeout** — a distinct message that the request timed out (database calls abort after 10 seconds; trend generation after 90 seconds).
- **Success** — the data itself. There is no extra success banner.

There is no customer-facing login in this app. It is an internal tool. **Trends** (`/trends`) runs on-demand Gemini analysis of stripped reviews (IDs and booking keys removed first).

### How to start it (non-technical)

You need Node.js installed, this project folder on your computer, and database keys from the person who owns the TaskLocal Supabase project. Do not put those keys in email, chat, or git.

1. Open a terminal in this project folder.
2. Run `npm install` once, to download the app’s dependencies.
3. Copy `.env.local.example` to a new file named `.env.local`. Ask the database owner to fill in the two keys (a public publishable key and a private service-role key). Leave the private key out of any shared document.
4. Run `npm run dev`.
5. In a browser, open [http://localhost:3000](http://localhost:3000). You should see the TaskLocal Trust & Safety dashboard.

If the dashboard shows a connection error or timeout, the keys or network are the first things to check with the database owner.

### Daily workflow

1. Open the dashboard and check **Unhandled Flags**. That number is the work waiting for you.
2. Click through to **Action needed**. Work from the top (oldest flags first).
3. Click a row to expand the review and booking. If the same person has several open flags, a badge calls that out.
4. When you have reviewed the issue, click **Resolve**. The item leaves the queue; the review itself stays in the catalog as handled.
5. Use **Reviews** when you need to search a specific ID, look at already-handled flags, or browse reviews that were never flagged. Type an ID and press **Search reviews** / **Search bookings**, or press Enter.
6. Open **Trends** (or **Generate trend report** on the dashboard) when you want a snapshot of flag, sentiment, and keyword patterns.

That is the whole loop: see the queue, open context, resolve, search the catalog when you need history, generate a trend report when you need the bigger picture.

## Working features

Moderation dashboard for Product D, including the Reviews Console slice (shipped on `main` via [#8](https://github.com/justin-day-pursuit/TaskLocal-TrustAndSafety/pull/8)):

- **Overview Dashboard (`/`)**: Live review stats (total, flagged, unhandled) plus connection status. Stat cards link to `/reviews`, `/reviews?flag=true`, and `/action-needed`.
- **Action needed (`/action-needed`)**: Open, unhandled review flags (`flag = true`, `handled = false`), oldest-first. Role tabs (All / Customer / Provider), repeat-flag badges, inline Resolve, click-to-expand Review + Booking, pagination. Detail at `/action-needed/[id]` includes Review, Booking, and Listing. `/flagged` and `/flagged/:id` permanently redirect here (308).
- **Reviews catalog (`/reviews`)**: All reviews with search, filter, sort, date windows (UTC), and pagination. Expandable Review + Booking rows. No inline Resolve; flagged+unhandled rows can link to Action needed.
- **Resolve**: Sets `handled = true` only. List/panel Resolve keeps the current query string; detail returns to the queue URL including `role`/`page`. Booking fetch failures show a banner and still render the review list.
- **Trends (`/trends`)**: On-demand Gemini report (flag trends, sentiment, keywords, action plan) with locally computed charts. Dashboard **Generate trend report** links to `/trends?generate=1`. Last report is stored in Supabase Storage (`tasklocal-trends`) with a local file fallback.
- **Request states**: Loading (spinner + description), error, and timeout for database and API calls. Success is the data. Privileged HTTP proxies return 504 on timeout and 500 on other errors.

Spec: [docs/PRD.md](docs/PRD.md).

### Placeholders
- **NLP / review themes**: Parked. `/reviews` is the all-reviews catalog, not an NLP page.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the env template and add keys:

```bash
cp .env.local.example .env.local
```

Set these values in `.env.local` (and the same names on the Vercel project):

- `NEXT_PUBLIC_SUPABASE_URL` — already prefilled in the example file
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — your Supabase publishable (anon) key, for public Provider / active Listing reads only
- `SUPABASE_SERVICE_ROLE_KEY` — server-only service role key. Ask the database owner for it directly (Supabase → Project Settings → API). Set it as a **non-`NEXT_PUBLIC_`** env var in Vercel. Never commit it, prefix it with `NEXT_PUBLIC_` / `VITE_`, or paste it into chat.

The service role key is required for Customer, Booking, and Review access once `005_enable_authenticated_rls.sql` runs. Those queries run on the Next.js server (`src/lib/supabase/service-role.ts`). The browser never receives this key.

Optional:

- `GEMINI_API_KEY` — server-only Google AI Studio key for `/trends`. Never prefix with `NEXT_PUBLIC_` or `VITE_`. The SDK also accepts `GOOGLE_API_KEY`; `GEMINI_API_KEY` wins when both are set. Optional `GEMINI_MODEL` locks a single model (otherwise the app tries `gemini-3.1-pro-preview`, then free fallbacks).
- `DASHBOARD_API_SECRET` — only if you need the HTTP proxies (`GET /api/flagged-reviews`, `POST /api/reviews/[id]/resolve`). They require `Authorization: Bearer $DASHBOARD_API_SECRET` and return 503 if that server-only env var is unset, 504 on query timeout, and 500 on other query errors. The dashboard UI does not call them.

### Pre-RLS checklist (do this before `005_enable_authenticated_rls.sql`)

1. Ask the database owner for the `service_role` key privately (Supabase → Project Settings → API). Do not paste it into chat, commits, or shared channels.
2. Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (gitignored).
3. Set the same variable on the Vercel project for Production (and Preview if you use preview deploys). Never prefix with `NEXT_PUBLIC_` or `VITE_`.
4. Optionally set `DASHBOARD_API_SECRET` only if you need the HTTP proxies; the dashboard UI does not require it.
5. Smoke test **while RLS is still off**: open `/`, `/action-needed`, resolve one flagged review, confirm Overview stats load.
6. After the migration runs, repeat that smoke test. Direct anon-key Review reads should fail; the dashboard should still work.

3. Start the local dev server:

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
    api/                # Privileged proxy routes (flagged reviews, resolve)
    reviews/            # All-reviews catalog
    trends/             # Gemini trend workspace
  components/           # UI, layout, queue, catalog, and trends components
    ui/                 # Shared status (QueryCallStatus, ConnectionStatus)
  lib/
    supabase/           # Publishable (public) + service-role (server) clients
    types/              # Shared schema TypeScript types
    constants/          # Enum value lists
    utils/              # ID generation helpers
    queries/            # Data access + query-status (timeouts, failureKind)
    reviews/            # URL params, dates, pagination, list presentation
    trends/             # Strip, aggregates, Gemini, persist
```

## Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — run production server
- `npm run lint` — ESLint
- `npm test` — run offline unit tests (Vitest; 23 files / 110 tests; no Supabase or `.env.local` required)

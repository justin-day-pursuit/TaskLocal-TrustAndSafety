# TaskLocal — Trust & Safety

Internal Daily Reviewer Dashboard for the TaskLocal Trust & Safety product (Product D). This app reads from and updates the shared Supabase Postgres database used across TaskLocal marketplace products.

> **Scope Note**: This repository covers **Product D (Trust & Safety Dashboard)** only. Marketplace products A (Provider), B (Customer), and C (Chatbot) are handled in separate services.

## For stakeholders

This product is the **Trust & Safety desk** for the TaskLocal marketplace. Customer and provider reviews are sometimes **reported** as a problem. Reviewers use this dashboard each day to check whether analysis is current, resolve unhandled reports, and search the full review catalog.

Primary navigation is **Dashboard**, **Reviews**, and **Analysis**.

### What it does

- **Dashboard** (`/`) — the daily work surface. Generate or regenerate analysis, see freshness against the 9:00 AM cutoff, open action cards into an inline report list, and read an executive overview of the latest analysis report.
- **Reviews** (`/reviews`) — the full catalog. Search by comment/report-reason text and by review or booking IDs, filter by report and resolution status, sort, and page through every review. Use this when you are looking something up, not when you are clearing unhandled reports.
- **Analysis** (`/analysis`) — on-demand Gemini analysis of stripped reviews: executive insights, comparison with the previous report, charts, themes, and the high-risk case. Chart numbers are computed locally; explanations come from Gemini.
- **Resolve** — the only action a reviewer takes here. It marks a reported item as handled. It does not delete the review or change the booking. Resolve lives on the dashboard report list, not on the Reviews catalog.

Reviews that are not reported cannot be marked handled. On the Reviews page, choosing **Not reported** turns off the Resolution status filter for that reason.

### How it works

The app talks to the same shared TaskLocal database as the rest of the marketplace. It does not create its own copy of reviews or bookings. Opening a row shows the review text plus the related booking so a reviewer can decide with context. Pagination and filters stay on the page; the review list scrolls in its own pane so the search bar does not disappear while you scan results.

Every database and API call has visible request states:

- **Loading** — a spinner and a description of the call in progress (for example, “Loading the reviews catalog…”).
- **Error** — a message that the call failed, with a short technical detail for staff.
- **Timeout** — a distinct message that the request timed out (database calls abort after 10 seconds; analysis generation after 90 seconds).
- **Success** — the data itself. There is no extra success banner.
- **Generating** — duplicate Generate/Regenerate is disabled; the last successful analysis report stays visible.

There is no customer-facing login in this app. It is an internal tool. Analysis input is stripped of unique identifiers and has free text redacted before it is sent to the model.

### How to start it (non-technical)

You need Node.js installed, this project folder on your computer, and database keys from the person who owns the TaskLocal Supabase project. Do not put those keys in email, chat, or git.

1. Open a terminal in this project folder.
2. Run `npm install` once, to download the app’s dependencies.
3. Copy `.env.local.example` to a new file named `.env.local`. Ask the database owner to fill in the two keys (a public publishable key and a private service-role key). Leave the private key out of any shared document.
4. Run `npm run dev`.
5. In a browser, open [http://localhost:3000](http://localhost:3000). You should see the TaskLocal Trust & Safety dashboard.

If the dashboard shows a connection error or timeout, the keys or network are the first things to check with the database owner.

### Daily workflow

1. Open **Dashboard** and check analysis freshness (**Current**, **Analysis due**, **Generating**, or **Generation failed**). If analysis is due, click **Generate analysis** or **Regenerate analysis**. Freshness uses a **9:00 AM** cutoff in the configured app timezone (`APP_TIME_ZONE`, default UTC).
2. Use the three action cards, in order: **New reports today**, **Total unhandled reports**, **High-risk case**. Selecting a card opens one shared report list under the cards (newest first). Selecting the same card again closes the list.
3. Work unhandled reports from that list. Click a row to expand the review and booking. When you have reviewed the issue, click **Resolve**. The item leaves the unhandled list; the review itself stays in the catalog as resolved.
4. Use **Reviews** when you need to search comment or report-reason text, look up a specific ID, or browse already-resolved reports. Type text and press **Search text**, or search IDs with **Search reviews** / **Search bookings** (or press Enter).
5. Open **Analysis** for the full report: high-risk case summary, charts, themes, and grounding tables. A high-risk result links to `/?view=highRisk` on the dashboard.

That is the whole loop: confirm analysis is current, open the matching dashboard card, resolve unhandled reports, search the catalog when you need history, and read the full analysis report when you need the bigger picture.

## Working features

Daily Reviewer Dashboard for Product D (built on the Reviews Console slice shipped on `main` via [#8](https://github.com/justin-day-pursuit/TaskLocal-TrustAndSafety/pull/8)):

- **Dashboard (`/`)**: **Generate analysis** / **Regenerate analysis** with freshness state and last-success timestamp. Three action cards — **New reports today** (`/?view=today`), **Total unhandled reports** (`/?view=unhandled`), **High-risk case** (`/?view=highRisk`) — open one shared, paginated report list (newest-first, default 25 rows) with optional text/role filters and inline **Resolve** on reported, unhandled rows. Below the list: **Executive brief**, **Changes since last report**, **Issue trends**, and **Sentiment trends** from the latest successful analysis. Booking fetch failures show a banner and still render the review rows.
- **Reviews catalog (`/reviews`)**: All reviews with **Search review text** (case-insensitive substring on comment or report reason), ID search, **Report status** (All / Reported / Not reported), **Resolution status** (All / Unhandled / Resolved, only when report status is not “Not reported”), sort, date windows (UTC), and pagination. Expandable Review + Booking rows. No inline Resolve; reported+unhandled rows link to `/?view=unhandled`. User-facing URLs use `report`; legacy `flag` query params are accepted and canonicalized to `report`.
- **Analysis (`/analysis`)**: On-demand Gemini analysis report (executive insights, comparison, charts, themes, high-risk case) with the same freshness/cutoff logic as Dashboard. **Generate analysis** on the dashboard runs the pipeline in place; `/analysis?generate=1` still auto-starts a run. Last report is stored in Supabase Storage (`tasklocal-trends`) with a local file fallback. High-risk content links to `/?view=highRisk`.
- **Resolve**: Sets `handled = true` only. After success, dashboard counts and lists refresh; the row leaves the list if it no longer matches the active card filter. Selected view, search, role, page, and expansion stay in the URL where still valid.
- **High-risk matching**: The latest successful analysis may include a `highRiskCase` with redacted search terms. The dashboard counts and lists reported rows whose comment or reason contains at least one term (escaped, case-insensitive). Analysis never resolves or hides a review. Stale analysis keeps matches but labels them stale.
- **Request states**: Loading (spinner + description), error, timeout, and generating. Success is the data. Privileged HTTP proxies return 504 on timeout and 500 on other errors.

Spec: [docs/PRD.md](docs/PRD.md).

### Compatibility redirects

These legacy paths permanently redirect (308) and are not current product pages:

- `/trends` (and its query string) → `/analysis`
- `/action-needed` → `/?view=unhandled`
- `/flagged` → `/?view=unhandled`
- `/action-needed/:id` and `/flagged/:id` → `/?view=unhandled&expanded=:id`

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

- `APP_TIME_ZONE` — non-secret IANA timezone (for example `America/New_York`) used for dashboard “new reports today” calendar-day bounds and the analysis freshness cutoff (9:00 AM local). If unset or invalid, the app uses `UTC`. Copy the commented example from `.env.local.example`.
- `GEMINI_API_KEY` — server-only Google AI Studio key for `/analysis`. Never prefix with `NEXT_PUBLIC_` or `VITE_`. The SDK also accepts `GOOGLE_API_KEY`; `GEMINI_API_KEY` wins when both are set. Optional `GEMINI_MODEL` locks a single model (otherwise the app tries `gemini-3.1-pro-preview`, then free fallbacks).
- `DASHBOARD_API_SECRET` — only if you need the HTTP proxies (`GET /api/flagged-reviews`, `POST /api/reviews/[id]/resolve`). They require `Authorization: Bearer $DASHBOARD_API_SECRET` and return 503 if that server-only env var is unset, 504 on query timeout, and 500 on other query errors. The dashboard UI does not call them.

### Pre-RLS checklist (do this before `005_enable_authenticated_rls.sql`)

1. Ask the database owner for the `service_role` key privately (Supabase → Project Settings → API). Do not paste it into chat, commits, or shared channels.
2. Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (gitignored).
3. Set the same variable on the Vercel project for Production (and Preview if you use preview deploys). Never prefix with `NEXT_PUBLIC_` or `VITE_`.
4. Optionally set `DASHBOARD_API_SECRET` only if you need the HTTP proxies; the dashboard UI does not require it.
5. Smoke test **while RLS is still off**: open `/`, open **Total unhandled reports**, resolve one reported review, confirm dashboard counts load, then open `/reviews` and `/analysis`.
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
- Review report/resolution columns remain `flag` and `handled` in the database; user-facing copy uses **reported** / **unhandled** / **resolved**.

## Project Structure

```
src/
  app/                  # Next.js routes (/, /reviews, /analysis)
    analysis/           # Analysis workspace + generate action
    actions/            # Shared Resolve (handled = true)
    api/                # Privileged proxy routes
    reviews/            # All-reviews catalog
  components/
    dashboard/          # Action cards, report list, freshness, overview
    analysis/           # Freshness indicator, high-risk summary
    reviews/            # Catalog table, search, expand
    layout/             # Nav: Dashboard, Reviews, Analysis
    trends/             # Charts and detail used by Analysis
    ui/                 # Shared status (QueryCallStatus)
  lib/
    config/             # APP_TIME_ZONE (IANA, default UTC)
    dashboard/          # Dashboard URL params and card labels
    supabase/           # Publishable (public) + service-role (server) clients
    types/              # Shared schema TypeScript types
    constants/          # Enum value lists
    utils/              # ID generation helpers
    queries/            # Data access + query-status (timeouts, failureKind)
    reviews/            # URL params, dates, pagination, list presentation
    trends/             # Freshness cutoff, strip, aggregates, Gemini, persist
```

## Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — run production server
- `npm run lint` — ESLint
- `npm test` — run offline unit tests (Vitest; 34 files / 221 tests on this branch; no Supabase or `.env.local` required)

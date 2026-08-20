# Product D — Reviews Console PRD

**Status:** shipped on `main` via [#8](https://github.com/justin-day-pursuit/TaskLocal-TrustAndSafety/pull/8) (`1f8ea69`). T1–T9 implemented. Planner close-gate was PASS-WITH-GAPS (live in-browser smoke unproven).  
**Date:** 2026-08-20  
**Owner surface:** TaskLocal Trust & Safety (this repo only)  
**Companion visual:** `.cursor/project-snapshot.canvas.tsx` (project context + this task list)

This document is the source of truth for the next implementation slice. Another agent should be able to implement from this file + the committed source without chat history.

---

## Read this first

| If you need… | Read |
|---|---|
| Product + setup | `README.md` |
| This slice (tasks, URL contract, acceptance) | **this file** |
| Domain types | `src/lib/types/database.ts` |
| Enums | `src/lib/constants/enums.ts` |
| Current queue/detail/resolve | `src/app/action-needed/**`, `src/lib/queries/reviews.ts` |
| Visual project context | `.cursor/project-snapshot.canvas.tsx` |

**What this app is:** internal moderation dashboard (Product D). It reads/writes a **shared** Supabase Postgres DB also used by Products A/B/C (other repos). Flag **creation** happens upstream. This app triages and marks `Review.handled = true`.

**What this app is not:** marketplace, chatbot, ban system, policy engine, or auth product.

---

## 1. Current state (do not regress)

Already shipped on `main` (Reviews Console squash [#8](https://github.com/justin-day-pursuit/TaskLocal-TrustAndSafety/pull/8)):

- `/` dashboard: total / flagged / unhandled counts + connection badge; cards link to `/reviews`, `/reviews?flag=true`, `/action-needed`.
- `/action-needed`: open flags (`flag=true`, `handled=false`), oldest-first, role tabs, repeat-flag badges, inline Resolve, expand rows, pagination. `/flagged` and `/flagged/:id` 308-redirect here.
- `/action-needed/[id]`: Review → Booking → Listing detail + Resolve (returns to the queue URL including query params).
- Resolve: `src/app/action-needed/actions.ts` → `resolveReview()` sets `handled=true` only. List/panel keep the current query string.
- `/reviews`: all-reviews catalog (search/filter/sort/dates/pagination + expand). Not an NLP page.
- `/trends`: placeholder (stays placeholder).
- Tests: `npm test` — Vitest, 12 files / 54 offline tests.

Hard rules that stay:

- Do **not** create, alter, or drop tables.
- Do **not** use the service role key.
- Table names are capitalized: `Provider`, `Listing`, `Customer`, `Booking`, `Review`.
- Enums are plain text in the DB; validate in app code (`src/lib/constants/enums.ts`).
- Resolve stays binary (`handled = true`). No dispositions, notes, or audit trail in this slice.

---

## 2. Goal of this slice

Give moderators a **full review catalog** they can search/filter/sort, keep a dedicated **work queue** for unhandled flags, make dashboard stats jump to the right list, and let a row click **expand** review + booking data without leaving the list. Add pagination and a real test harness. Fix two known queue bugs.

---

## 3. Naming decision (locked)

| Old | New | Why |
|---|---|---|
| Nav “Flagged Reviews” `/flagged` | **Action needed** `/action-needed` | This page is the **work queue** of unhandled flags. “Flag resolution” sounds like a completed-work archive. “Flagged reviews” collides with the catalog filter `flag=true` (which includes already-handled flags). |
| Nav “Review Themes” `/reviews` | **Reviews** `/reviews` | Becomes the catalog of **all** reviews. NLP/themes stay parked (not on this route). |

Dashboard labels stay:

- **Total Reviews** → `/reviews`
- **Flagged Reviews** → `/reviews?flag=true` (catalog, flagged, including handled)
- **Unhandled Flags** → `/action-needed` (queue, `flag=true` and `handled=false`)

Keep old URLs working:

- `/flagged` → `/action-needed`
- `/flagged/:id` → `/action-needed/:id`

Use Next.js redirects (`next.config.ts`) rather than leaving a duplicate page.

Nav active state: `/action-needed/[id]` must highlight **Action needed** (`pathname.startsWith(href + "/")`, but not for `/`).

---

## 4. Locked scope

### In this slice (must ship)

| ID | Task |
|---|---|
| **T1** | Rename flagged queue → Action needed; redirects; nav copy |
| **T2** | All-reviews list at `/reviews` (replace NLP placeholder) |
| **T3** | Search / filter / sort / date granularity on `/reviews` |
| **T4** | Click-to-expand row: structured Review + Booking (both lists) |
| **T5** | Dashboard stat cards are links (see §3) |
| **T6** | Pagination on `/reviews` and `/action-needed` |
| **T7** | Booking fetch error must **not** hide the review list |
| **T8** | Preserve query string after Resolve (role filter, page, etc.) |
| **T9** | Automated tests + `npm test` |

### Parking lot (do not implement now)

- Auth / RLS / RBAC
- Non-binary resolve (dismiss vs uphold, notes, actor)
- Unused scaffold cleanup (`DataTable`, `generateId`, `createBrowserClient`, `getListingsByIds`)
- Fetching Provider/Customer **names** (IDs on booking are enough this slice)
- `/trends` analytics
- NLP / review themes
- CI workflows
- Bans, cases, policy engine, risk scores

---

## 5. Shared domain (copy these field lists)

From `src/lib/types/database.ts`.

**Review** (list columns + expand section)

| Field | Type | List? | Expand? |
|---|---|---|---|
| `id` | `rev_…` | yes | yes |
| `bookingId` | `bkg_…` | yes | yes |
| `reviewerRole` | `customer` \| `provider` | yes | yes |
| `rating` | number | yes | yes |
| `comment` | string | truncated | full |
| `flag` | boolean | yes | yes |
| `reason` | string | yes | yes |
| `handled` | boolean | yes | yes |
| `createdAt` | ISO string | yes | yes |

**Booking** (expand / hideable extension — all columns)

| Field | Type | Controls on `/reviews` |
|---|---|---|
| `id` | `bkg_…` | search |
| `listingId` | `lst_…` | search |
| `customerId` | `cus_…` | search |
| `providerId` | `prv_…` | search |
| `status` | `requested` \| `confirmed` \| `completed` \| `cancelled` | filter |
| `priceAtBooking` | number | sort |
| `requestedAt` | ISO string | sort |
| `serviceDate` | ISO string \| null | sort |

Listing context (`Listing` via `booking.listingId`) is **optional** on the dedicated detail page only. The inline expand is Review + Booking, not Listing.

---

## 6. Feature specs

### T1 — Action needed

- Move `src/app/flagged/` → `src/app/action-needed/` (page, `[id]`, `actions.ts`, `not-found`).
- Page title: **Action needed**. Subtitle: open flagged reviews waiting to be resolved, oldest first.
- Keep role tabs, repeat-flag badges, Resolve.
- Row click **expands** (T4). Do not navigate away on row click. Keep `/action-needed/[id]` as a deep-link full page (include a small “Open full page” in the expanded panel).
- Revalidate both `/action-needed` and `/flagged` (redirect target) after resolve, plus `/reviews`.

### T2 + T3 — Reviews catalog (`/reviews`)

One list container. Default sort: `createdAt` descending (newest first).

**Review-level controls**

| Control | Behavior |
|---|---|
| Search IDs | Case-insensitive prefix/substring on `Review.id` and `Review.bookingId` |
| Filter `reviewerRole` | All / customer / provider |
| Filter `flag` | All / true / false |
| Filter `handled` | All / true / false |
| Sort `rating` | asc / desc |
| Sort `createdAt` | asc / desc |

**Booking-level controls** (apply to the review’s related booking)

| Control | Behavior |
|---|---|
| Search IDs | Prefix/substring on booking `id`, `listingId`, `customerId`, `providerId` |
| Filter `status` | All or one of `BOOKING_STATUSES` |
| Sort `priceAtBooking` | asc / desc |
| Sort `requestedAt` | asc / desc |
| Sort `serviceDate` | asc / desc; nulls last |

Only **one** sort field is active at a time (`sort` + `dir`). Booking sorts order the review rows by the related booking field. Reviews whose booking failed to load sort last.

**Date granularity** (always on `Review.createdAt`, timezone **UTC**)

1. Recency preset `createdWithin`:
   - `all` (default)
   - `today` — from start of current UTC day
   - `week` — rolling last 7 days
   - `month` — rolling last 30 days
   - `year` — rolling last 365 days
2. Calendar month `createdMonth`: `1`–`12` or unset. Matches `createdAt` month-of-year (any year unless the recency window also applies).

If both recency and month are set, **AND** them. Empty results are OK (show empty state).

All controls combine with AND. Changing any filter resets `page` to `1`.

### T4 — Expand / hide

- Clicking a row (or its chevron) toggles expansion. Clicking Resolve must **not** toggle the row.
- Expanded panel is a structured definition list, two blocks:
  1. **Review** — every Review field.
  2. **Booking** — every Booking field, with its own show/hide control (default **shown** when the row is expanded).
- Missing booking: show the review block and an error/empty note in the booking block. Do not collapse the whole row.
- On **Action needed**, Resolve stays available on the row and in the expanded panel.
- On **Reviews**, no Resolve button (this is a catalog). Flagged+unhandled rows may link to Action needed.

*(Status: Shipped on `main` via #8.)*

### T5 — Clickable dashboard badges

Wrap or extend `StatCard` with an `href`. Cards must be keyboard-accessible (`<Link>` or `<a>`, not click-only `div`).

| Card | Target |
|---|---|
| Total Reviews | `/reviews` |
| Flagged Reviews | `/reviews?flag=true` |
| Unhandled Flags | `/action-needed` |

Update dashboard copy that still says “flagged queue”.

*(Status: Shipped on `main` via #8.)*

### T6 — Pagination

- Both `/reviews` and `/action-needed`.
- Query: `page` (1-based, default 1), `pageSize` (default **25**, allow 10/25/50).
- Use Supabase `.range()` + exact count. Show “Showing X–Y of Z”.
- Out-of-range page → clamp to last page or empty state with a reset control.
- Known limit: PostgREST defaults to max 1000 rows per request. If a booking-side filter requires fetching a large ID set, document the cap in UI when hit (`Z` or loaded count ≥ 1000). Do **not** add a DB view.

**Query strategy (no schema changes):**

- Review-only filters/sorts: push to Supabase (`eq` / `ilike` / `gte` / `order` / `range`).
- Booking search/filter/sort: query `Booking` first with those predicates, take matching `id`s, then query `Review` with `.in("bookingId", ids)` plus review predicates, then paginate.
- Keep helpers in `src/lib/queries/` — no new microservice.

### T7 — Booking fetch must not blank the list

**Bug:** `src/app/flagged/page.tsx` skips `FlaggedQueueTable` when `bookingsError` is set.

**Fix:** always render the review list when reviews loaded. If bookings fail: banner, `repeatFlagCounts` empty/zero, booking expand shows the error. Same rule on `/reviews`.

*(Status: Shipped on `main` via #8.)*

### T8 — Preserve query string on Resolve

**Bug:** detail `redirectTo="/flagged"` (and any future redirect) drops `?role=`.

**Fix:**

- `ResolveButton` default: `router.refresh()` (already keeps current URL).
- If `redirectTo` is used, caller must pass the full path **including** search (e.g. `/action-needed?role=customer&page=2`).
- Prefer staying on the current list after resolve (row disappears from Action needed after refresh).
- `revalidatePath` for `/action-needed`, `/action-needed/[id]`, `/reviews`, and redirect aliases.

*(Status: Shipped on `main` via #8.)*

### T9 — Tests

Add Vitest (`npm test`). No live-DB requirement for CI-less local runs.

**Must cover (pure functions / query-param parsers):**

- URL parse/serialize for `/reviews` (every param in §7).
- UTC recency windows + month filter AND logic.
- Pagination clamp (page 0, page past end).
- `computeRepeatFlagCounts` (already in `reviews.ts`) — same-party, exclude self, missing booking → 0.
- Booking-error UI contract: list still shown (component or helper test).

**Nice to have:** Resolve action revalidate paths; redirect map `/flagged` → `/action-needed`.

Do **not** add Playwright in this slice unless it is free with existing deps.

*(Status: Shipped on `main` via #8. `npm test` is 12 files / 54 offline tests.)*

---

## 7. URL contract

### `/reviews`

| Param | Values | Default |
|---|---|---|
| `qReview` | string | unset |
| `qBooking` | string | unset |
| `reviewerRole` | `customer` \| `provider` | all |
| `flag` | `true` \| `false` | all |
| `handled` | `true` \| `false` | all |
| `bookingStatus` | `requested` \| `confirmed` \| `completed` \| `cancelled` | all |
| `sort` | `rating` \| `createdAt` \| `priceAtBooking` \| `requestedAt` \| `serviceDate` | `createdAt` |
| `dir` | `asc` \| `desc` | `desc` |
| `createdWithin` | `all` \| `today` \| `week` \| `month` \| `year` | `all` |
| `createdMonth` | `1`–`12` | unset |
| `page` | int ≥ 1 | `1` |
| `pageSize` | `10` \| `25` \| `50` | `25` |
| `expanded` | review id | unset (optional; open that row) |

Dashboard **Flagged Reviews** sets `flag=true` only. Do not also set `handled`.

### `/action-needed`

Keep existing `role` (`customer` \| `provider`) for the tabs. Add `page`, `pageSize`, optional `expanded`. Default sort remains **oldest first** (`createdAt asc`). Do not require the full `/reviews` filter bar here.

---

## 8. Suggested implementation order

1. **T7** — smallest bugfix, unblocks honest lists.  
2. **T1** — route rename + redirects + nav (everything else links here).  
3. **T9 skeleton** — Vitest + parser helpers first so T3 can TDD the URL contract.  
4. **T2 / T3 / T6** — catalog query + list + pagination.  
5. **T4** — shared expandable row on both pages.  
6. **T5** — dashboard links.  
7. **T8** — resolve + searchParams.  
8. **T9 finish** — remaining tests; `npm run lint` and `npm run build` must pass.

Use a feature branch (e.g. `feat/reviews-console`). Small commits per task ID.

---

## 9. Files likely to change

| Area | Paths |
|---|---|
| Routes | `src/app/flagged/**` → `src/app/action-needed/**`; `src/app/reviews/page.tsx`; `src/app/page.tsx`; `next.config.ts` |
| Nav | `src/components/layout/NavLinks.tsx` |
| UI | `src/components/ui/StatCard.tsx`; new list/expand components under `src/components/reviews/` (keep `src/components/flagged/` or rename if you touch most files) |
| Queries | `src/lib/queries/reviews.ts`, `bookings.ts`; new `src/lib/reviews/search-params.ts` (parse/serialize) |
| Tests | `src/lib/**/*.test.ts` (or `src/**/*.test.ts`) |
| Docs | `README.md` (after ship: replace placeholder language) |

Do not delete `/trends`. Do not add auth.

---

## 10. Acceptance checklist

- [ ] Nav: Dashboard, Action needed, Reviews, Trends.
- [ ] `/flagged` and `/flagged/:id` redirect to Action needed equivalents.
- [ ] `/reviews` lists all reviews with every Review column; booking block expands/hides with every Booking column.
- [ ] All §7 `/reviews` params work and are shareable (copy URL, reload, same view).
- [ ] Date presets + month-of-year behave as specified (UTC).
- [ ] Pagination on both lists; filter change resets to page 1.
- [ ] Dashboard three stats navigate as specified.
- [ ] Row click expands structured Review + Booking; Action needed still has Resolve.
- [ ] Booking fetch failure shows a banner and **still shows** reviews.
- [ ] Resolve from Action needed (list or detail) keeps `role` / `page` query params.
- [ ] `npm test`, `npm run lint`, `npm run build` pass.
- [ ] No schema migrations. No service role key. Resolve still only sets `handled=true`.

---

## 11. Non-goals reminder

If a follow-up agent is tempted to “just add” any of these, **stop** — they are parking lot: auth, RLS, richer resolve, scaffold deletion, Provider/Customer names, trends charts, NLP, GitHub Actions, bans.

---

## 12. Open questions (defaults if unset)

These are decided so implementers do not block:

| Question | Default |
|---|---|
| Timezone for “today” | UTC |
| “Month” recency | Rolling 30 days, not calendar month (calendar month is `createdMonth`) |
| Catalog Resolve button | No |
| Expand booking by default | Yes, once the row is open |
| Page size | 25 |
| Old `/flagged` URLs | Redirect, do not keep a second implementation |

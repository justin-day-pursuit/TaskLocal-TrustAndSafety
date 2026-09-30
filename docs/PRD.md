# Product D — Daily Reviewer Dashboard PRD

**Status:** implemented and merged to `main` (Daily Reviewer Dashboard PRs #22–#32). Planner close-gate **PASS-WITH-GAPS** (live Playwright / Gemini / visual §4 a11y UNPROVEN).
**Date:** 2026-08-25
**Owner surface:** TaskLocal Trust & Safety
**Source of truth:** this document plus committed source; no chat history is required.

**Implementation outcome:** Verified U1–U10 on `feat/dashboard-integration` @ `35c3289`, then merged to `main`. Green gate: 35 files / 225 tests, lint 0, build 0. Residual gaps (not fails): live in-browser / Playwright smoke, live Gemini, visual §4 a11y, and live-DB count-parity.

## 1. Product goal

Refactor the app into a high-clarity workspace for an internal reviewer who visits daily to:

1. see whether the latest analysis is current;
2. identify and resolve reports requiring action;
3. understand intake volume, high-risk cases, issue trends, and sentiment;
4. search all reviews by the language in comments and report reasons.

The dashboard is the primary work surface. It combines action queues and an executive overview; the full Reviews catalog and Analysis workspace remain supporting pages.

## 2. Locked terminology and navigation

User-facing copy must use:

| Internal/current term | User-facing term |
|---|---|
| `flag`, flagged review | **report**, **reported review** |
| Flagged Reviews | **Reports** |
| Unhandled Flags | **Unhandled reports** |
| Trends, trend report | **Analysis**, **analysis report** |
| Generate/Regenerate trend report | **Generate/Regenerate analysis** |

Database fields, server types, and internal query names may remain `flag` to avoid a schema migration. Never expose “flag” or “trend” as current product terminology.

Primary navigation, in order:

1. **Dashboard** — `/`
2. **Reviews** — `/reviews`
3. **Analysis** — `/analysis`

Remove **Action needed** from navigation and retire it as a standalone work page. Its report-list and Resolve workflows move to dashboard drill-downs.

Compatibility redirects:

- `/trends` and its query string → `/analysis`
- `/action-needed` → `/?view=unhandled`
- `/flagged` → `/?view=unhandled`
- `/action-needed/:id` and `/flagged/:id` → `/?view=unhandled&expanded=:id`

Redirects must not create duplicate implementations.

## 3. Platform constraints

- Do not create, alter, or drop database tables.
- Shared tables remain capitalized: `Provider`, `Listing`, `Customer`, `Booking`, `Review`.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it through a `NEXT_PUBLIC_`/`VITE_` variable or client bundle.
- Resolution remains binary: Resolve sets `Review.handled = true`. No disposition, note, policy action, or audit trail is added.
- Analysis input remains stripped of unique identifiers and has free text redacted before it is sent to the model.
- Database calls retain a 10-second timeout; analysis generation retains a 90-second timeout.
- Existing review and booking data must remain visible when booking enrichment fails.

## 4. Visual and accessibility requirements

The redesign must increase legibility and make required action obvious:

- Use a base body size of at least `16px`; primary page titles at least `30px`; card values at least `28px`; controls and metadata at least `14px`.
- Text, controls, borders, cards, selected states, and page background must meet WCAG 2.1 AA contrast. Body text requires 4.5:1; large text and meaningful UI boundaries require 3:1.
- Use consistent icons for freshness, warning/high risk, reports, unresolved work, and Resolve. Every icon must have adjacent visible text or an accessible name.
- Stale, high-risk, unresolved, error, and selected states must never rely on color alone. Pair color with an icon and explicit status text.
- Pages/cards requiring attention show a visible signal in navigation or on the relevant card. Decorative icons must be hidden from assistive technology.
- All cards and controls are keyboard-accessible, have visible focus states, and use semantic buttons/links.
- Prefer high-contrast surfaces and clear section boundaries over low-contrast gray-on-gray panels.

## 5. Dashboard (`/`)

Render sections in this exact order.

### 5.1 Analysis freshness and generation

The first dashboard control is **Generate analysis** when no report exists and **Regenerate analysis** afterward.

Show next to it:

- freshness icon and text: **Current**, **Analysis due**, **Generating**, or **Generation failed**;
- the last successful generation timestamp in the configured app timezone;
- when stale, the message “Analysis has not been generated since today’s review cutoff.”

Freshness is calendar-cutoff based, not a rolling 24-hour timer:

- Configure an IANA timezone as `APP_TIME_ZONE`; default to `UTC` if unset or invalid.
- The daily cutoff is **9:00 AM** in that timezone.
- At or after 9:00 AM, the latest acceptable generation time is today at 9:00 AM.
- Before 9:00 AM, the latest acceptable generation time is yesterday at 9:00 AM.
- The analysis is stale if it has never succeeded or its saved generation time is earlier than the latest cutoff.
- A failed regeneration does not replace the last successful report and does not make stale data current.
- Stale state shows a warning signal on the dashboard and Analysis nav/page. Current state shows a positive signal without implying that underlying source data is live.

Clicking Generate/Regenerate runs the existing analysis pipeline, persists the result, refreshes all analysis-backed dashboard content, and reports loading/error/timeout states without blanking the last successful report.

### 5.2 Action cards

Display exactly three cards, in this order:

| Card | Count and filter | Signal |
|---|---|---|
| **New reports today** | `flag=true` and `createdAt` within the current calendar day in `APP_TIME_ZONE` | Reports icon; attention signal when count > 0 |
| **Total unhandled reports** | `flag=true AND handled=false` | Unresolved icon; attention signal when count > 0 |
| **High-risk case** | Reported rows matching the latest high-risk analysis terms; count is the number of matching rows | High-risk warning when matches exist; stale warning when analysis is stale |

Each card is a semantic button. Selecting it:

- sets the selected state and updates `view` in the URL;
- opens one shared list container immediately below all three cards;
- applies only that card’s locked filter plus the list’s optional text/role filters;
- does not navigate away or stack multiple lists;
- toggles closed when the selected card is clicked again.

The list is newest-first, paginated at 25 rows by default, and shows Review data with expandable Booking context. Each row displays reported/resolved status using product terminology. Reported, unhandled rows provide **Resolve** in the row and expanded panel. After success, refresh counts and lists; remove the row if it no longer matches the active filter. Preserve selected view, search, role, page, and expansion state where still valid.

Empty states must explain the active filter. Booking load errors show a banner but do not hide Review rows.

### 5.3 Analysis overview

Below the action-card list, show these sections from the latest successful analysis:

1. **Executive brief** — concise current business health, including what is going well, what needs attention, and recommended actions.
2. **Changes since last report** — material changes since the prior comparable analysis; show an explicit first-report state when no comparison exists.
3. **Issue trends** — noticed report reasons/themes, direction, and material concentration.
4. **Sentiment trends** — changes in rating/sentiment, notable language themes, and direction.

Show the analysis timestamp and stale/current status with this overview. Never present stale analysis as current. If no analysis exists, render a compact prompt to Generate analysis instead of empty insight cards.

## 6. High-risk analysis and report matching

The generated analysis must include one nullable `highRiskCase` object:

```ts
type HighRiskCase = {
  title: string;
  summary: string;
  rationale: string;
  searchTerms: string[]; // redacted words or short phrases only
} | null;
```

Rules:

- The model receives no Review, Booking, Customer, Provider, or Listing identifiers.
- `searchTerms` must contain only terms/phrases grounded in redacted `comment` or `reason` input. Exclude names, emails, phone numbers, addresses, IDs, and reconstructed identifiers.
- Match terms server-side, case-insensitively, as escaped substring searches across `Review.comment` OR `Review.reason`.
- A row matches when `flag=true`, comment or reason is non-empty, and at least one search term matches either field.
- Deduplicate rows matching multiple terms. Do not expose which source row the model may have inferred.
- The high-risk card and drill-down use the latest successful analysis. If the analysis is stale, retain results but label them stale.
- If `highRiskCase` is null or terms produce no rows, show count `0` and an explanatory no-match state. Never silently substitute all reports.
- Analysis can prioritize a case but cannot resolve, hide, or mutate a review.

## 7. Reviews (`/reviews`)

Keep the existing all-reviews catalog, sorting, dates, pagination, expandable Review/Booking details, and booking-failure behavior, with these changes:

- Add one visible **Search review text** control. It performs a case-insensitive escaped substring search across `Review.comment` OR `Review.reason`.
- Keep ID search available for Review/Booking IDs; text search and ID search combine with AND.
- Rename all `flag` labels and values to **Report status**: All / Reported / Not reported.
- Use **Resolution status**: All / Unhandled / Resolved. Resolution status is only meaningful for reported reviews.
- Remove the Booking status filter and `bookingStatus` URL parameter.
- Do not add Resolve to the full Reviews catalog in this slice.
- Replace links to Action needed with links to the matching dashboard view.

All active filters combine with AND and reset the page to 1. Search is server-side and must work across all matching rows, not only the current page.

## 8. Analysis (`/analysis`)

Rename the current Trends page and all user-facing copy to **Analysis**. Preserve:

- on-demand Generate/Regenerate behavior;
- latest persisted report;
- executive insights, comparison with the previous report, charts, themes, and grounding tables;
- loading, error, and timeout handling.

Add the high-risk case summary, rationale, and safe search terms to this page. Show the same freshness state and cutoff logic as Dashboard. A high-risk result links to `/?view=highRisk`; no unique identifier is required.

## 9. URL contract

Unknown or invalid values fall back safely to defaults. Filter changes reset `page=1`.

### Dashboard `/`

| Parameter | Values | Default |
|---|---|---|
| `view` | `today` \| `unhandled` \| `highRisk` | unset/closed |
| `q` | string; comment/reason substring | unset |
| `role` | `customer` \| `provider` | all |
| `page` | integer ≥ 1 | `1` |
| `pageSize` | `10` \| `25` \| `50` | `25` |
| `expanded` | Review ID | unset |

### Reviews `/reviews`

| Parameter | Values | Default |
|---|---|---|
| `qText` | string; comment/reason substring | unset |
| `qReview` | string | unset |
| `qBooking` | string | unset |
| `reviewerRole` | `customer` \| `provider` | all |
| `report` | `true` \| `false` | all |
| `handled` | `true` \| `false` | all |
| `sort` | existing supported Review/Booking sort fields | `createdAt` |
| `dir` | `asc` \| `desc` | `desc` |
| `createdWithin` | `all` \| `today` \| `week` \| `month` \| `year` | `all` |
| `createdMonth` | `1`–`12` | unset |
| `page` | integer ≥ 1 | `1` |
| `pageSize` | `10` \| `25` \| `50` | `25` |
| `expanded` | Review ID | unset |

Use `report` in new user-facing URLs; accept legacy `flag` URLs temporarily and canonicalize them to `report`. Remove `bookingStatus`.

## 10. Request and mutation states

- **Loading:** show a spinner/skeleton and state what is loading; keep stable controls visible.
- **Error:** show actionable plain-language copy and optional technical detail.
- **Timeout:** distinguish timeout from other errors.
- **Generating:** disable duplicate generation, preserve the previous successful report, and show progress.
- **Empty/no match:** name the active filter and offer a clear/reset-search action.
- **Resolve success:** refresh affected counts/lists without a success-only interstitial.
- **Resolve failure:** keep the row visible and show an inline error; never optimistically mark it resolved permanently.
- **Partial booking failure:** show Review data and a Booking error state.

## 11. Implementation map

Likely affected areas:

- Dashboard: `src/app/page.tsx`, `src/components/ui/StatCard.tsx`
- Navigation/routes: `src/components/layout/NavLinks.tsx`, `next.config.ts`, `src/app/action-needed/**`, `src/app/trends/**`, new `src/app/analysis/**`
- Dashboard report list: reuse/refactor components in `src/components/flagged/**` and `src/components/reviews/**`
- Reviews filters/search: `src/app/reviews/page.tsx`, `src/lib/reviews/search-params.ts`, `src/lib/queries/review-catalog.ts`
- Analysis contract/generation: `src/lib/trends/types.ts`, `src/lib/trends/gemini.ts`, `src/lib/trends/generate.ts`, `src/components/trends/**`
- Freshness/timezone logic: add pure helpers under `src/lib/trends/`
- Resolve/revalidation: `src/app/action-needed/actions.ts`, `src/lib/queries/reviews.ts`

Implementation may rename internal `trends`/`flagged` folders when practical, but correct routes, visible terminology, and behavior are the requirement.

## 12. Acceptance criteria

Close-gate **PASS-WITH-GAPS** at `35c3289`: items with offline/unit/build evidence are SATISFIED; live Playwright, Gemini, visual §4 a11y, and live-DB count-parity remain UNPROVEN (gaps, not fails). Boxes below are the original spec checklist.

- [ ] Navigation is Dashboard, Reviews, Analysis; no Action needed item remains.
- [ ] No current UI copy uses “flag/flagged” or “trend” for reports/analysis.
- [ ] Legacy Trends, Action needed, and Flagged routes redirect as specified.
- [ ] Typography minimums, WCAG AA contrast, focus visibility, accessible names, and non-color-only signals meet §4.
- [ ] Dashboard begins with Generate/Regenerate analysis and displays generation/freshness state plus last-success timestamp.
- [ ] Cutoff tests cover before, exactly at, and after 9:00 AM; previous-day reports; never-generated; invalid timezone; and failed regeneration.
- [ ] Dashboard cards appear in the required order and their counts equal their drill-down result counts.
- [ ] Selecting one card opens one correctly filtered, shareable inline list; Resolve updates the row and all counts.
- [ ] New reports today uses the configured timezone’s calendar-day boundaries.
- [ ] High-risk analysis contains no identifiers, returns safe grounded search terms, and matches reported rows by escaped case-insensitive comment/reason substring.
- [ ] High-risk null, stale, no-match, multi-term, and deduplication cases are tested.
- [ ] Dashboard shows Executive brief, Changes since last report, Issue trends, and Sentiment trends from the latest successful report.
- [ ] Reviews text search covers comment and reason across the full dataset; ID searches still work; all filters combine with AND.
- [ ] Reviews uses Report/Resolution labels, removes Booking status filtering, and has no Resolve action.
- [ ] Analysis preserves existing charts/detail, adds high-risk content, and shares dashboard freshness state.
- [ ] Booking enrichment failure never hides Review rows.
- [ ] No schema migration is added; the service role stays server-only; Resolve only sets `handled=true`.
- [ ] Automated tests cover URL parsing/canonicalization, filters, pagination, matching, freshness, and timezone boundaries.
- [ ] `npm test`, `npm run lint`, and `npm run build` pass before implementation is considered complete.

## 13. Non-goals

- Staff authentication or RBAC
- New database tables, columns, views, or migrations
- Multi-step case management, policy enforcement, bans, risk scoring, or automated resolution
- Resolve dispositions, notes, actors, or audit history
- Provider/Customer display-name enrichment
- Replacing the existing analysis charts or model provider

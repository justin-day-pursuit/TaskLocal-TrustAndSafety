# PROJECT_CONTEXT.md

> Master shared-memory document for the agent orchestration system. Curated by
> `context-curator`; updated by `knowledge-builder`. All worker agents rebuild context from this
> file + their assigned task + their received handoff only.

## Project overview
TaskLocal Trust & Safety — a Next.js application (App Router) backed by Supabase. Current surface
includes a review-moderation data path (`src/lib/supabase/server.ts`, `Review` table with `flag` /
`handled` columns). Fill in product goals and scope as the `task-decomposer` and `planner` produce
their first requirements summary.

## Architecture notes
- Framework: Next.js (see `node_modules/next/dist/docs/` for this repo's exact conventions —
  APIs may differ from general knowledge).
- Data: Supabase (REST via publishable key; see `.env.local`).
- Agent system specs live in `.cursor/` (this directory): roster in `.cursor/agents/`,
  contracts in `.cursor/contracts/`, handoffs in `.cursor/handoffs/`, logs in `.cursor/logs/`.

## Coding conventions
- TypeScript, Next.js App Router.
- (To be expanded by `knowledge-builder` as conventions are established.)

## Current focus
- Bootstrapping the multi-agent orchestration team.

## Known issues
- (None recorded yet. `event-manager` and `context-curator` append here.)

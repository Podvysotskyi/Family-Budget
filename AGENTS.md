# AGENTS.md

## Purpose

This repository is an Nx-managed family budgeting workspace with:

- `apps/web`: Nuxt 4 SSR frontend using Nuxt UI and Pinia
- `apps/api`: NestJS API using TypeORM, PostgreSQL, and the recurring budget scheduler

Agents working here should keep changes narrow, align with existing workspace patterns, and avoid introducing new tooling unless it solves a concrete repo problem.

## Workspace Layout

- `apps/web/app`: Nuxt application code
- `apps/web/server`: Nuxt server routes and backend proxy helpers
- `apps/api/src/modules`: NestJS feature modules
- `apps/api/src/modules/budget-scheduler`: recurring budget scheduler module
- `apps/api/src/modules/database/migrations`: TypeORM migrations
- `docs`: feature behavior and implementation notes that must stay aligned with code
- `README.md`: local setup and run instructions
- `PLAN.md`: implementation notes for the scheduler

## Setup And Run

Use PNPM only. This workspace is configured around `pnpm-lock.yaml`.

```bash
pnpm install
cp .env.example .env
docker compose up -d
```

Primary development commands:

```bash
pnpm dev
pnpm dev:web
pnpm dev:api
```

Primary verification commands:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Useful migration commands:

```bash
pnpm migration:run
pnpm migration:show
pnpm migration:generate
```

## Runtime Defaults

- Web app: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:3001`
- Scheduling: runs inside the API process

For local Google OAuth, the documented callback is:

```txt
http://127.0.0.1:3000/auth/google/callback
```

## Repo-Specific Guidance

### General

- Prefer existing Nx, Nuxt, NestJS, and TypeORM patterns over new abstractions.
- Keep frontend work inside the existing Nuxt app structure.
- Keep backend work inside the appropriate NestJS module unless a shared concern clearly warrants extraction.

### Documentation

- Keep docs up to date with the current implementation.
- When changing feature behavior, API endpoints, data models, ownership rules, UI flows, or scheduler behavior, update the matching document in `docs/` in the same change.
- If a relevant doc does not exist, create a focused feature doc under `docs/` rather than burying behavior notes in code comments.
- Treat stale docs as part of the bug: if code and docs disagree, either update the docs or explicitly call out why the docs are intentionally unchanged.
- Do not create feature-specific Codex skills just to document current implementation; use focused files in `docs/` for that.
- For credit-card changes, update `docs/credit-cards.md` whenever endpoints, response shape, store flow, modal/page behavior, date handling, or cancellation/balance semantics change.

### Database And Migrations

- Use TypeORM migrations for schema changes.
- Keep migration changes scoped to the feature being implemented.
- Treat idempotency and conflict-safe inserts as first-class concerns for recurring or scheduled writes.

### Scheduling

- The scheduling service is intended to be safe to run repeatedly.
- Preserve startup execution, hourly execution, and overlap protection behavior.
- Be careful with timezone-sensitive date logic. The repo currently documents `America/Chicago` as the scheduling default.

### Frontend

- Match the current Nuxt UI component patterns and store organization.
- Use the existing Pinia stores and server proxy utilities before adding new data-access layers.

## Change Discipline

- Prefer focused edits over broad refactors.
- Do not switch package managers.
- Do not hand-edit generated output unless the repo already treats it as source.
- If you change behavior that spans apps, run at least the relevant `lint`, `typecheck`, or `build` targets before finishing.

## Gaps To Keep In Mind

- `PLAN.md` notes that automated unit tests for scheduling date utilities are still missing.
- There is no documented dedicated test script at the workspace root right now; rely on lint, typecheck, build, and targeted validation until tests are added.

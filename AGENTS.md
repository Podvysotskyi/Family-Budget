# AGENTS.md

## Purpose

This repository is an Nx-managed family budgeting workspace.

- `apps/web`: Nuxt 4 SSR frontend using Nuxt UI, Pinia, and server routes for auth/API proxying
- `apps/api`: NestJS API using TypeORM, PostgreSQL, Google auth integration, and the recurring budget scheduler

Keep changes narrow, follow the existing Nuxt/Nest/TypeORM patterns, and avoid adding new tooling unless it solves a concrete problem in this repo.

## Workspace Layout

- `apps/web/app`: Nuxt app source
- `apps/web/app/components`: Vue components grouped by feature
- `apps/web/app/pages`: Nuxt routes
- `apps/web/app/stores`: Pinia stores
- `apps/web/app/types`: frontend TypeScript contracts
- `apps/web/server`: Nuxt server routes, auth callbacks, session helpers, and API proxy utilities
- `apps/api/src/modules`: NestJS feature modules
- `apps/api/src/modules/database`: TypeORM config and migrations
- `apps/api/src/modules/budget-scheduler`: recurring budget scheduler
- `docs`: feature behavior and implementation notes that must stay aligned with code
- `README.md`: local setup and operational commands
- `PLAN.md`: scheduler implementation notes

## Setup And Run

Use PNPM only. The workspace is configured with `pnpm-lock.yaml` and `packageManager: pnpm@11.8.0`.

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
pnpm migration:show
pnpm migration:run
pnpm migration:revert
pnpm migration:generate -- apps/api/src/modules/database/migrations/NameOfMigration
pnpm migration:create apps/api/src/modules/database/migrations/NameOfMigration
pnpm migration:check
```

## Runtime Defaults

- Web app: `http://127.0.0.1:3000`
- API: `http://127.0.0.1:3001`
- PostgreSQL: `localhost:5432`
- Scheduling: runs inside the API process

For local Google OAuth, use this callback:

```txt
http://127.0.0.1:3000/auth/google/callback
```

Important environment variables are documented in `.env.example`.

## Repo-Specific Guidance

### General

- Prefer existing Nx, Nuxt, NestJS, Pinia, Nuxt UI, and TypeORM patterns over new abstractions.
- Keep frontend work inside the existing Nuxt app structure unless the change clearly belongs in `apps/web/server`.
- Keep backend work inside the appropriate NestJS module unless a shared concern clearly warrants extraction.
- Keep API contracts, frontend types, stores, and docs aligned when changing feature behavior.

### Documentation

- Keep docs up to date with the current implementation.
- When changing feature behavior, API endpoints, data models, ownership rules, UI flows, scheduler behavior, date handling, or cancellation semantics, update the matching document in `docs/` in the same change.
- If a relevant doc does not exist, create a focused feature doc under `docs/`.
- Treat stale docs as part of the bug: if code and docs disagree, either update the docs or explicitly call out why the docs are intentionally unchanged.
- For credit-card changes, update `docs/credit-cards.md` whenever endpoints, response shape, store flow, modal/page behavior, date handling, or cancellation/balance semantics change.
- For subscription changes, update `docs/subscriptions.md` when due-date, amount-history, transaction, autopay, page, or API behavior changes.
- For goal changes, update `docs/goals.md` when target, transaction, closing/deletion, page, or API behavior changes.

### Database And Migrations

- Use TypeORM migrations for schema changes.
- Keep migration changes scoped to the feature being implemented.
- Do not rely on `synchronize` behavior for schema changes.
- Treat idempotency and conflict-safe inserts as first-class concerns for recurring or scheduled writes.
- Keep entity, migration, repository, DTO, frontend type, and docs changes synchronized.

### Scheduling

- The budget scheduler should be safe to run repeatedly.
- Preserve startup execution, hourly execution, and overlap protection behavior.
- Be careful with timezone-sensitive date logic. The documented default is `America/Chicago`.
- `SCHEDULING_ENABLED=false` disables scheduler execution locally.
- `SCHEDULING_TIMEZONE` overrides the scheduler timezone.

### Frontend

- Match current Nuxt UI component patterns and Pinia store organization.
- Use `apps/web/app/types` for shared frontend contracts.
- Use existing composables such as `useStoreApi`, `useAppToast`, `useAbortController`, `useDateUtils`, and `useCurrencyUtils` before adding new data-access or formatting helpers.
- Keep modal, page shell, page header, and list/list-item ownership consistent with nearby feature folders.
- Use Nuxt server routes and proxy utilities for API/auth flows before adding new client-side networking patterns.

### Backend

- Keep controllers, services/repositories, DTOs, entities, and module wiring colocated in the owning feature module.
- Keep auth-sensitive endpoints aligned with the existing request-user/internal-auth patterns.
- Prefer repository methods for persistence details instead of spreading TypeORM query logic across controllers.

## Change Discipline

- Prefer focused edits over broad refactors.
- Do not switch package managers.
- Do not hand-edit generated output unless the repo already treats it as source.
- Do not introduce feature-specific Codex skills to document current implementation; use focused files in `docs/`.
- If behavior spans apps, run at least the relevant `lint`, `typecheck`, or `build` target before finishing.

## Gaps To Keep In Mind

- `PLAN.md` notes that automated unit tests for scheduling date utilities are still missing.
- There is no dedicated root test script right now; rely on lint, typecheck, build, and targeted validation until tests are added.

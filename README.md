# Family Budget

Nx-managed family budgeting app with a Nuxt 4 SSR frontend and a NestJS API.

- `apps/web`: Nuxt 4, Nuxt UI, Pinia, server auth routes, and backend proxy routes
- `apps/api`: NestJS, TypeORM, PostgreSQL, Google user auth, household budgeting, subscriptions, goals, credit cards, and recurring budget scheduling

## Requirements

- Node.js
- PNPM `11.8.0`
- Docker for local PostgreSQL

Use PNPM for all dependency and script commands. `npm install` is not supported for this workspace.

## Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm migration:run
```

The Docker Compose file starts PostgreSQL 17 on `localhost:5432` with the credentials from `.env.example`.

For local Google OAuth, add this authorized redirect URI in Google Cloud:

```txt
http://127.0.0.1:3000/auth/google/callback
```

Then set these values in `.env`:

```bash
NUXT_OAUTH_GOOGLE_CLIENT_ID=
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=
```

`NUXT_SESSION_PASSWORD`, `SESSION_SECRET`, and `INTERNAL_API_SECRET` should be at least 32 characters.

## Development

Run both apps:

```bash
pnpm dev
```

Or run them separately:

```bash
pnpm dev:api
pnpm dev:web
```

Local URLs:

- Frontend: `http://127.0.0.1:3000`
- Backend: `http://127.0.0.1:3001`
- Database: `postgres://family_budget:family_budget@localhost:5432/family_budget`

## Environment

Defaults are defined in `.env.example`.

- `DATABASE_URL`: TypeORM/PostgreSQL connection string
- `API_PORT`: NestJS API port, default `3001`
- `FRONTEND_URL`: allowed frontend origin for API CORS
- `NUXT_API_BASE`: API base URL used by the Nuxt server
- `GOOGLE_OAUTH_CALLBACK_URL`: Google OAuth callback URL
- `NUXT_OAUTH_GOOGLE_CLIENT_ID`: Google OAuth client ID
- `NUXT_OAUTH_GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `NUXT_SESSION_PASSWORD`: Nuxt session password
- `SESSION_SECRET`: shared session fallback secret
- `INTERNAL_API_SECRET`: secret used for internal API calls
- `SCHEDULING_ENABLED`: set to `false` to disable scheduler execution
- `SCHEDULING_TIMEZONE`: scheduler timezone, default `America/Chicago`

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```

There is no dedicated root test script yet.

## Database Migrations

Run pending migrations:

```bash
pnpm migration:run
```

Show migration status:

```bash
pnpm migration:show
```

Generate a migration from entity changes:

```bash
pnpm migration:generate -- apps/api/src/modules/database/migrations/NameOfMigration
```

Create an empty migration:

```bash
pnpm migration:create apps/api/src/modules/database/migrations/NameOfMigration
```

Revert the latest migration:

```bash
pnpm migration:revert
```

Check for ungenerated schema changes:

```bash
pnpm migration:check
```

## Project Layout

```txt
apps/
  api/
    src/modules/              NestJS feature modules
    src/modules/database/     TypeORM config and migrations
    src/modules/budget-scheduler/
  web/
    app/components/           Vue feature components
    app/pages/                Nuxt routes
    app/stores/               Pinia stores
    app/types/                frontend contracts
    server/                   Nuxt server routes and API/session helpers
docs/                         feature behavior docs
```

## Feature Docs

Keep docs in sync with behavior changes:

- `docs/credit-cards.md`
- `docs/goals.md`
- `docs/subscriptions.md`

`PLAN.md` contains scheduler implementation notes.

## Scheduler

The recurring budget scheduler runs inside the API process. It is enabled by default, runs on API startup, runs hourly, and is intended to be safe to execute repeatedly.

Local controls:

```bash
SCHEDULING_ENABLED=false
SCHEDULING_TIMEZONE=America/Chicago
```

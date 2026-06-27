# Family Budget

Nx-managed family budgeting app.

- `apps/web`: Nuxt SSR frontend with Nuxt UI
- `apps/api`: NestJS backend with TypeORM, PostgreSQL, and recurring budget scheduling

## Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d
```

Use `pnpm install` for this workspace. `npm install` is not supported because the repo is configured as a PNPM workspace and uses `pnpm-lock.yaml`.

For local Google OAuth, add this authorized redirect URI:

```txt
http://127.0.0.1:3000/auth/google/callback
```

## Development

```bash
pnpm dev
```

Or run apps separately:

```bash
pnpm dev:api
pnpm dev:web
```

Frontend: `http://127.0.0.1:3000`
Backend: `http://127.0.0.1:3001`
Scheduling: runs inside the API process

Scheduling is enabled by default. Set `SCHEDULING_ENABLED=false` to disable it locally, or set `SCHEDULING_TIMEZONE` to override the default `America/Chicago` scheduling timezone.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```

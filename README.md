# Family Budget

Nx-managed family budgeting app.

- `apps/web`: Nuxt SSR frontend with Nuxt UI
- `apps/api`: NestJS backend with TypeORM and PostgreSQL

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
pnpm dev:scheduling
```

Frontend: `http://127.0.0.1:3000`
Backend: `http://127.0.0.1:3001`
Scheduling: background worker, no HTTP port

To run the scheduling worker in Docker:

```bash
docker compose --profile workers up scheduling
```

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```

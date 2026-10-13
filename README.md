# Household finance

A shared household finance app built with Laravel 13, Inertia 3, Vue 3, TypeScript, Tailwind 4, PostgreSQL 17, and Redis 8. The implementation follows the product documentation and screen designs in [docs](docs/technical-design.md).

## Start with Docker Compose

Install and start Docker Desktop with **Linux containers**, or Docker Engine with Compose v2 on Linux. No host PHP, Composer, Node, PostgreSQL, or Redis installation is required.

From this directory on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start.ps1
```

On macOS or Linux:

```sh
sh scripts/start.sh
```

The scripts copy `.env.example` if needed, generate a persistent encryption key, build the application and frontend, start PostgreSQL and Redis, apply migrations, and grant the restricted application role. Open **http://localhost:8080** and sign in with Google after configuring the credentials below. Startup does not seed users or financial records.

New households receive the default categories required by the product; accounts, transactions, schedules, and targets start empty. Automated tests create their own fixtures in the separate test database. Preserve `.env` and its `APP_KEY`: replacing that key makes existing encrypted bank credentials unreadable.

The stack contains `web` (Nginx), `app` (PHP-FPM), `worker`, `scheduler`, `init`, `postgres`, and `redis`. Only the web port binds to the host, on loopback. Database and Redis data live in named volumes. The runtime database role cannot bypass household row-level security or modify append-only balance and audit history; migrations run separately as the database administrator.

```sh
docker compose ps
docker compose logs --tail=100 web app worker scheduler init
docker compose down
```

`down` preserves data. **Do not use `down --volumes` unless you intend to destroy local financial data.** Rebuild after application changes with the same startup script. Changing database passwords on an existing volume requires changing the database role password as well as `.env`; initialization scripts run only on a new volume.

## Features

- Google sign-in, household creation and invitations, linked and unlinked members, owner transfer, immediate membership revocation, and role-aware navigation.
- Calendar/list views, income, bills, subscriptions, recurring date previews, scoped edits, completed snapshots, and deletion tombstones.
- Manual accounts, dated balance observations, credit limits, generated card bills, and an observed net-worth chart with a data table.
- Finite loan repayment schedules with exact final installments, extra payments and corrections, reversals, and checkpoints when toggling schedule tracking.
- Manual transactions and annotations, hidden/deleted states, payment attachments, amount/date/account matching suggestions, and audit history.
- Categories and monthly budget targets, refund-aware actuals, explicit transfer exclusions, and deduplicated threshold notifications.
- Timezone-aware reminders with daylight-saving handling, inbox actions, durable outbox jobs, and scheduled reconciliation.
- A gated Lunch Flow OAuth/import adapter with encrypted credentials, household-bound identities, sync coalescing, partial-account commits, and holdings snapshots.

Amounts are integer cents in PostgreSQL and decimal strings at form boundaries. Completing a bill records completion; it does not execute a bank payment. A balance observation does not create a transaction. The current product is USD-only.

## Authentication and bank integration

For Google sign-in, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the matching `GOOGLE_REDIRECT_URI` in `.env`. The default callback is `http://localhost:8080/auth/google/callback`. Configure that exact redirect in the OAuth application, then recreate the application services to load the new environment.

Lunch Flow is disabled by default. Provider credentials and the live contract have **not** been validated here. Before enabling it, verify account-type and investment-activity mapping, pending-to-posted identity links, pagination, OAuth scopes, and disconnect semantics against the provider account. Missing successor links are never inferred; absent rows never cause transaction deletion. Set the `LUNCHFLOW_*` variables and `LUNCHFLOW_ENABLED=true` after that verification. Manual finance workflows remain available without provider credentials; investments have an explicit empty state.

Invitations appear to the matching verified Google user on sign-in. Email delivery and push notifications are not configured.

## Verification

The backend suite uses a separate `finance_test` PostgreSQL database, including actual database constraints and a restricted-role row-level-security test.

```sh
docker compose --profile test run --rm --build tests
```

For frontend tests and type/build validation, with Node 24 installed:

```sh
npm ci
npm test
npm run build
```

Verified: **23 PHP tests, 269 assertions; 3 Vue component tests; TypeScript and production asset build; Compose configuration validation; browser sign-in, calendar, navigation, and account creation using the restricted PostgreSQL role.** Backend tests ran against PostgreSQL 17. The full Compose stack was built and started successfully. The same 23 backend tests passed inside its Linux test container against PostgreSQL 17. Browser sign-in and navigation through Nginx use encrypted Redis sessions; Redis keys and scheduled reconciliation were verified. Live provider requests, worker recovery under failure, load targets, and restore drills still require release validation.

## Operations and release gates

This Compose configuration is for local development use. A production release needs HTTPS and secure cookies, OAuth credentials, strong managed secrets, provider acceptance tests, retention decisions, alerting, load tests, and a tested backup/restore procedure. The technical design records proposed operating targets and remaining business assumptions.

For a consistent backup from a running stack:

```sh
docker compose exec postgres pg_dump -U finance_admin -d finance -Fc -f /tmp/finance.dump
docker compose cp postgres:/tmp/finance.dump ./finance.dump
```

Protect backups as financial data and store them outside the repository. Preserve `APP_KEY` separately. Restore into a separate recovery environment first and verify household isolation, balances, schedules, and audit counts before switching traffic. A restore drill has not yet been executed.

Workers use an 11-minute Redis retry window with a 10-minute maximum job duration. Sync jobs avoid automatic replay of uncertain provider requests; failed/interrupted runs remain visible and can be retried explicitly. Monitor failed jobs and worker liveness. Redis uses AOF persistence and `noeviction`; lost-queue recovery and scheduler/outbox delivery still require deployment verification.

Source entry points: [routes](routes/web.php), [domain services](app/Domain), [migrations](database/migrations), [Vue pages](resources/js/Pages), and [Compose](compose.yaml).

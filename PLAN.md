# Scheduling Microservice Plan

## Goal

Create a new `scheduling` microservice that runs every hour and ensures every household has budget records for the current month:

- one monthly budget covering the current calendar month
- weekly budgets covering each week that intersects the current calendar month

The job must be idempotent so running it hourly never creates duplicate budgets.

## Implementation Status

Completed:

- Added `apps/scheduling` as a NestJS application-context worker.
- Added hourly scheduling with `@nestjs/schedule`.
- Added startup execution plus hourly execution.
- Added in-process overlap protection.
- Added PostgreSQL advisory locking for multi-instance protection.
- Added current-month and intersecting-week date utilities.
- Added `BudgetsRepository.ensureBudgets()` using conflict-safe insert.
- Added `HouseholdsRepository.listIds()`.
- Added unique index migration for `budgets(household_id, type, start_date)`.
- Added `dev:scheduling`, build, and typecheck wiring.
- Added `SCHEDULING_ENABLED` and `SCHEDULING_TIMEZONE` env defaults.
- Added a profile-gated Docker Compose worker service.
- Verified idempotency against a temporary database.

Still open:

- Add automated unit tests for date utilities.
- Decide whether entities should eventually move into a shared workspace library.

## Proposed Shape

Add a new NestJS app under `apps/scheduling`.

The service should be a small worker process, not an HTTP API. It should start, connect to PostgreSQL with TypeORM, register an hourly scheduler, and run the budget generation job.

Recommended app structure:

```txt
apps/scheduling/
  project.json
  nest-cli.json
  tsconfig.app.json
  package.json
  src/
    main.ts
    app.module.ts
    modules/
      database/
      budget-scheduler/
```

Reuse shared backend domain code where practical:

- `BudgetEntity`
- `BudgetType`
- `HouseholdEntity`
- shared TypeORM database config

If importing API module paths directly becomes awkward, extract shared entities/config into a workspace library later. For the first pass, direct imports from `apps/api/src/modules/...` are acceptable if TypeScript paths and build config stay simple.

## Scheduling Behavior

Use `@nestjs/schedule`.

Install and register:

```bash
pnpm add @nestjs/schedule
```

Scheduler:

- run once on service startup
- then run every hour
- avoid overlapping runs with an in-process lock

Example behavior:

```txt
onApplicationBootstrap:
  ensureCurrentMonthBudgets()

@Cron(CronExpression.EVERY_HOUR):
  ensureCurrentMonthBudgets()
```

For multi-instance deployments, add a database-level advisory lock so only one scheduler instance runs the job at a time.

## Budget Creation Rules

For each household:

1. Determine the current month in the configured app timezone.
2. Ensure one monthly budget exists:
   - `type = month`
   - `startDate = first day of current month`
   - `endDate = last day of current month`
3. Ensure weekly budgets exist for all weeks intersecting the current month.
   - `type = week`
   - `startDate = week start`
   - `endDate = week end`
   - clamp or do not clamp weekly dates needs one explicit decision.

Recommended weekly rule:

- Use calendar weeks from Monday through Sunday.
- Include every week that intersects the current month.
- Do not clamp week boundaries to the month. This makes weekly budgets stable and avoids partial-week duplicates across adjacent months.

Example for June 2026:

```txt
monthly:
  2026-06-01 to 2026-06-30

weekly:
  2026-06-01 to 2026-06-07
  2026-06-08 to 2026-06-14
  2026-06-15 to 2026-06-21
  2026-06-22 to 2026-06-28
  2026-06-29 to 2026-07-05
```

## Database Constraints

Add a unique index to prevent duplicates:

```txt
household_id, type, start_date
```

This should be added through a TypeORM migration.

The scheduler should use an upsert or `INSERT ... ON CONFLICT DO NOTHING` style operation. Do not rely only on application-side existence checks.

## Required Code Changes

1. Add a `BudgetsRepository`.
   - `ensureBudget(input)`
   - `ensureBudgets(inputs)`
   - Use a conflict-safe insert.

2. Add a `HouseholdsRepository` method for scheduler use.
   - `listIds()`
   - Return only ids to keep the hourly job lightweight.

3. Add `BudgetSchedulerService`.
   - Calculates current month windows.
   - Lists households.
   - Ensures monthly and weekly budgets for each household.
   - Logs counts: households scanned, budgets attempted, budgets created/skipped.

4. Add date utilities.
   - `getCurrentMonthRange(now)`
   - `getWeeksIntersectingMonth(monthRange)`
   - Keep these as pure functions with focused tests.

5. Add migration.
   - unique index on `budgets(household_id, type, start_date)`

6. Add Nx/package scripts.
   - `dev:scheduling`
   - include `scheduling` in build/typecheck targets if appropriate

7. Update Docker/deployment config.
   - Add a separate scheduling service container.
   - It should use the same `DATABASE_URL`.
   - It should not expose HTTP ports.

## Configuration

Add environment variables:

```txt
SCHEDULING_ENABLED=true
SCHEDULING_TIMEZONE=America/Chicago
```

Default behavior:

- enabled by default in the scheduling app
- timezone defaults to `America/Chicago`

If timezone support needs to be exact across DST and non-local deployments, add a date library such as `date-fns-tz` or `luxon`. Otherwise, use UTC calendar dates consistently and document that decision.

## Testing Plan

Unit tests:

- month range calculation
- weekly range calculation
- idempotent budget input generation
- edge cases:
  - month starts on Monday
  - month starts on Sunday
  - month ends mid-week
  - February in leap year

Integration checks:

- run scheduler once with an empty `budgets` table
- run scheduler twice and verify no duplicates
- add two households and verify each gets all expected budgets
- verify unique constraint blocks duplicates

## Rollout Steps

1. Add unique-index migration for budget idempotency.
2. Implement repository methods.
3. Implement date utilities with tests.
4. Scaffold `apps/scheduling`.
5. Wire TypeORM and scheduler module.
6. Add local Docker service.
7. Run migrations.
8. Start scheduler locally and verify budgets are created.
9. Run the scheduler a second time and confirm no duplicates.
10. Add README notes for running the worker.

## Open Decisions

- Whether weekly budget dates should be full Monday-Sunday weeks or clamped to the current month.
- Whether scheduling should use app timezone or UTC.
- Whether entities should remain imported from `apps/api` or move into a shared workspace library before the service grows.

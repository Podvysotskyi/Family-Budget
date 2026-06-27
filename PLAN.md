# Scheduling Plan

Scheduling runs inside the API process through `apps/api/src/modules/budget-scheduler`.

## Goal

Run a scheduler every hour and ensure every household has budget records for the current month:

- one monthly budget covering the current calendar month
- weekly budgets covering each week that intersects the current calendar month

The job must be idempotent so running it hourly never creates duplicate budgets.

## Implementation Status

Completed:

- Moved scheduling into the API module graph.
- Added hourly scheduling with `@nestjs/schedule`.
- Added startup execution plus hourly execution.
- Added in-process overlap protection.
- Added PostgreSQL advisory locking for multi-instance protection.
- Added current-month and intersecting-week date utilities.
- Added `BudgetsRepository.ensureBudgets()` using conflict-safe insert.
- Added `HouseholdsRepository.listIds()`.
- Added unique index migration for `budgets(household_id, type, start_date)`.
- Added build and typecheck wiring through the API target.
- Added `SCHEDULING_ENABLED` and `SCHEDULING_TIMEZONE` env defaults.
- Verified idempotency against a temporary database.

Still open:

- Add automated unit tests for date utilities.
- Decide whether entities should eventually move into a shared workspace library if cross-app reuse returns.

## Current Shape

The scheduler is an API module. It starts with the API process, connects through the existing TypeORM setup, registers an hourly scheduler, and runs the budget generation job.

Recommended app structure:

```txt
apps/api/src/modules/budget-scheduler/
  budget-scheduler.module.ts
  budget-scheduler.service.ts
```

Reuse API domain modules and repositories instead of introducing a second app boundary.

## Scheduling Behavior

Uses `@nestjs/schedule`.

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

For multi-instance deployments, the scheduler uses a PostgreSQL advisory lock so only one API instance runs the job at a time.

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

## Implementation Notes

1. `BudgetsRepository`
   - `ensureBudgets(inputs)`
   - Use a conflict-safe insert.

2. `HouseholdsRepository`
   - `listIds()`
   - Return only ids to keep the hourly job lightweight.

3. `BudgetSchedulerService`
   - Calculates current month windows.
   - Lists households.
   - Ensures monthly and weekly budgets for each household.
   - Logs counts: households scanned, budgets attempted, budgets created/skipped.

4. Date utilities
   - `getCurrentMonthRange(now)`
   - `getWeeksIntersectingMonth(monthRange)`
   - Keep these as pure functions with focused tests.

5. Migration
   - unique index on `budgets(household_id, type, start_date)`

6. Keep Nx/package scripts routed through the API build/typecheck targets.

7. Keep Docker/deployment config routed through the API service.

## Configuration

Add environment variables:

```txt
SCHEDULING_ENABLED=true
SCHEDULING_TIMEZONE=America/Chicago
```

Default behavior:

- enabled by default in the API app
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
4. Add the API-local scheduler module.
5. Wire the scheduler module into the API app.
6. Use the API service for local Docker/deployment runs.
7. Run migrations.
8. Start the API locally and verify budgets are created.
9. Run the scheduler a second time and confirm no duplicates.
10. Keep README notes clear that scheduling runs inside the API process.

## Open Decisions

- Whether weekly budget dates should be full Monday-Sunday weeks or clamped to the current month.
- Whether scheduling should use app timezone or UTC.

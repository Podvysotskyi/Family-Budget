# Goals

Goals model household or user-assigned savings targets. A goal owns stable metadata, while target amounts are stored as a separate history table.

## Data Model

### `goals`

Stores the goal identity and lifecycle:

- `id`
- `household_id`
- `user_id`
- `name`
- `start_date`
- `end_date`
- `include_in_budget`
- `created_at`
- `updated_at`

The goal row does not store the target amount. Targets are versioned in `goal_targets`.

`user_id` is nullable. A null `user_id` means the goal is assigned to the household. A non-null `user_id` means the goal is assigned to that household member.

`include_in_budget` controls whether the goal should be considered part of budget planning.

### `goal_targets`

Stores target history:

- `goal_id`
- `date`
- `type`
- `amount`
- `created_at`
- `updated_at`

`goal_id` and `date` are unique together. This means a goal can only have one target record for a given effective date.

Target type can be:

- `monthly`
- `weekly`
- `total`

When a user changes a goal target, the API writes a target record with the current date. If the target is changed multiple times for the same goal on the same date, the existing row for that date is updated instead of creating another row.

When the app needs the current target, it uses the latest target record by `date`.

### `goal_transactions`

Stores goal contribution or withdrawal history:

- `goal_id`
- `user_id`
- `date`
- `amount`
- `created_at`
- `updated_at`

Goal transactions are separate from goal metadata and target history. Existing transactions prevent permanent deletion of a goal.

## Creating Goals

When a goal is created:

1. A `goals` row is created.
2. An initial `goal_targets` row is upserted using the current date.
3. The created goal is returned with its user assignment and target history.

The API validates:

- the current user belongs to the household
- the goal name is present
- dates use `YYYY-MM-DD`
- `end_date`, when present, is on or after `start_date`
- the target amount is greater than zero
- the target type is `monthly`, `weekly`, or `total`
- user-assigned goals can only be assigned to the current user

## Updating Goals

When a goal is updated:

1. Goal metadata is updated on the `goals` row.
2. The submitted target is compared with the latest target record.
3. If the target amount or type changed, a `goal_targets` row is upserted for the current date.
4. The updated goal is returned with its user assignment and target history.

Updating a target does not overwrite older target records with different dates. This keeps target history available while preventing duplicate rows for the same goal and effective date.

If only metadata changes and the target is unchanged, no new target record is created unless the latest target record is already for the current date. Same-day saves update the current-date row.

## Closing Goals

Deleting a goal from the normal UI flow does not delete the database row.

The `DELETE /households/:id/goals/:goalId` endpoint closes the goal by setting `goals.end_date` to the current date. This preserves goal metadata, target history, and transactions.

The current date comes from `SCHEDULING_TIMEZONE`, defaulting to `America/Chicago`.

## Permanent Deletion

Goals can be permanently deleted only when they have no transactions.

The `DELETE /households/:id/goals/:goalId/permanent` endpoint:

1. Verifies the current user belongs to the household.
2. Verifies the goal belongs to the household and is visible to the current user.
3. Checks `goal_transactions` for rows tied to the goal.
4. Deletes the `goals` row only when the transaction count is zero.

Deleting the `goals` row cascades to `goal_targets`.

If a goal has transactions, the API returns an error and the goal must be closed instead of permanently deleted.

## Listing Goals

The goals page loads goals from `GET /households/:id/goals`.

The API returns goals that are either:

- assigned to the household
- assigned to the current user

Each returned goal includes:

- goal metadata
- assigned user details, when assigned to a user
- `currentTarget`
- full target history, sorted newest first
- `transactionCount`
- `canDeletePermanently`
- timestamps

The frontend can filter the returned list to active goals. A goal is considered active when `end_date` is null or `end_date` is today or later.

## UI Behavior

The `/goals` page supports:

- creating a goal
- editing goal metadata
- changing the target amount or target type
- closing a goal
- permanently deleting a goal when it has no transactions
- showing active goals only

The close confirmation tells the user that the action sets the goal end date and keeps transactions intact.

The permanent delete action is shown only when `canDeletePermanently` is true.

## Timezone

Current-date behavior uses `SCHEDULING_TIMEZONE`, defaulting to `America/Chicago`.

This affects:

- the date used for target history upserts
- the date used when closing a goal
- active goal filtering in the UI

Goal start and end dates are stored as date-only values and are not converted between timezones.

## Migration Notes

The goals migration:

1. Creates the `goal_target_type` enum.
2. Creates `goals`.
3. Creates `goal_targets`.
4. Creates `goal_transactions`.
5. Adds the uniqueness rule for `goal_targets.goal_id` and `goal_targets.date`.

The target uniqueness migration removes duplicate same-goal, same-date target rows before creating the unique index. When duplicates exist, the newest row by `updated_at`, `created_at`, and `id` is kept.

# Subscriptions

Subscriptions model recurring charges. A subscription owns stable metadata, while charge amounts and charge dates are stored as separate history tables.

## Data Model

### `subscriptions`

Stores the subscription identity and configuration:

- `id`
- `household_id`
- `name`
- `user_id`
- `type`
- `start_date`
- `end_date`
- `autopay`
- `created_at`
- `updated_at`

The subscription row does not store an `amount`. Amounts are versioned in `subscription_amounts`.

### `subscription_amounts`

Stores amount history:

- `subscription_id`
- `date`
- `amount`

`subscription_id` and `date` are the primary key. This means a subscription can only have one amount record per day.

When a user changes a subscription amount, the API writes an amount record with the current date. If the amount is changed multiple times on the same day, the existing record for that date is updated instead of creating another record.

When the app needs an amount for a subscription charge, it uses the latest amount record whose `date` is on or before the charge date. If no prior amount exists, it falls back to the earliest amount record.

### `subscription_due_dates`

Stores actual subscription charge dates:

- `subscription_id`
- `date`

`subscription_id` and `date` are the primary key. These rows are the source of truth for when a subscription charge happens.

The app does not calculate payable subscription occurrences directly from `start_date` during budget views or payments. `start_date` is used when creating future `subscription_due_dates`, but charge display, manual payment, and autopay are based on persisted `subscription_due_dates`.

## Creating Subscriptions

When a subscription is created:

1. A `subscriptions` row is created.
2. An initial `subscription_amounts` row is created using the subscription `start_date`.
3. `subscription_due_dates` rows are created from `start_date` through the current active month.

If the subscription starts in the past, this creates records for previous months through the current month.

## Updating Subscriptions

When a subscription is updated:

1. Subscription metadata is updated on the `subscriptions` row.
2. The requested amount is compared with the effective amount for today.
3. If the amount changed, `subscription_amounts` is upserted for today.
4. `subscription_due_dates` are ensured through the current active month.
5. If an `end_date` is set, future subscription dates and transactions after that date are removed.

Changing an amount no longer closes the old subscription and creates a replacement subscription.

## Canceling Subscriptions

Subscriptions are canceled by setting `end_date`; they are not deleted from the normal UI flow.

When a subscription is canceled:

1. `subscriptions.end_date` is set to the selected effective date.
2. Future subscription dates after that date are removed.
3. Future subscription transactions after that date are removed.

The effective date must be on or after the subscription `start_date`. Already canceled subscriptions cannot be canceled again.

## Listing Subscriptions

The subscriptions page loads subscriptions from `GET /households/:id/subscriptions`.

The frontend can filter the returned list to active subscriptions. A subscription is considered active only when `end_date` is null. Any subscription with `end_date` set is treated as canceled, even if the date is today or in the future.

Canceled subscriptions show a `Canceled` label and do not show edit, cancel, or delete actions. The subscriptions page does not expose a delete action.

## Budget Views

Budget subscription lists load persisted `subscription_due_dates` within the requested date range.

Each returned budget subscription occurrence includes:

- subscription id
- subscription name
- assigned user id
- occurrence date
- amount effective on the occurrence date

This lets historical budget periods show the amount that was effective for that charge date.

## Manual Payments

When a user marks a subscription as paid:

1. The API validates that the requested occurrence date is inside the selected budget period.
2. The API validates that the occurrence date exists in `subscription_due_dates`.
3. A `subscription_transactions` row is created with the amount effective on that occurrence date.

Transactions still snapshot the amount at payment time. Later amount changes do not mutate existing paid transactions.

## Autopay

The scheduler maintains subscription dates and processes autopay.

On API startup:

1. Budget periods are ensured.
2. Active budget periods are synced.
3. Subscription dates are ensured for the current active month.

Every hour:

1. Budget periods are ensured.
2. At midnight in the scheduling timezone, active budget periods are synced.
3. At midnight, subscription dates are ensured for the current active month.
4. At midnight, autopay subscriptions due on the current date are paid.

Autopay only selects subscriptions that:

- have `autopay = true`
- are active for the current date
- have a `subscription_due_dates` row for the current date

The autopay transaction amount is the amount effective on the current date.

## Timezone

Current-date behavior uses `SCHEDULING_TIMEZONE`, defaulting to `America/Chicago`.

This affects:

- the date used for same-day amount upserts
- the active month used when ensuring subscription dates
- the date used by autopay

## Migration Notes

The subscription history migration:

1. Creates `subscription_amounts`.
2. Creates `subscription_due_dates`.
3. Backfills `subscription_amounts` from the old `subscriptions.amount` column using `subscriptions.start_date`.
4. Backfills `subscription_due_dates` from existing subscription recurrence rules through the current month.
5. Drops `subscriptions.amount`.

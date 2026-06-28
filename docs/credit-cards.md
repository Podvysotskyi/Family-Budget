# Credit Cards

Credit cards model household or user-assigned cards. A credit card owns stable metadata, while card limits are stored as a separate history table.

## Data Model

### `credit_cards`

Stores the credit card identity and lifecycle:

- `id`
- `household_id`
- `user_id`
- `name`
- `start_date`
- `end_date`
- `due_date`
- `created_at`
- `updated_at`

The credit card row does not store a `limit`. Limits are versioned in `credit_card_limits`.

`user_id` is nullable. A null `user_id` means the card is assigned to the household. A non-null `user_id` means the card is assigned to that household member.

### `credit_card_limits`

Stores limit history:

- `credit_card_id`
- `date`
- `limit`
- `created_at`
- `updated_at`

`credit_card_id` and `date` are unique together. This means a credit card can only have one limit record for a given date.

When a user changes a card limit, the API writes a limit record for the card `start_date`. If the limit is changed multiple times for the same card and same date, the existing row is updated instead of creating another row.

When the app needs the current card limit, it uses the latest limit record whose `date` is on or before the current date. If no prior limit exists, it falls back to the earliest limit record.

### `credit_card_balances`

Stores balance history:

- `credit_card_id`
- `date`
- `balance`
- `created_at`
- `updated_at`

`credit_card_id` and `date` are unique together. Balance rows are separate from card metadata and limit history.

## Creating Credit Cards

When a credit card is created:

1. A `credit_cards` row is created.
2. `end_date` is set to null.
3. `start_date` is derived as the earlier of the current date and the submitted `due_date`.
4. An initial `credit_card_limits` row is upserted using the derived `start_date`.
5. The created card is returned with its user assignment and limit history.

The API validates:

- the current user belongs to the household
- the card name is present
- dates use `YYYY-MM-DD`
- the limit is greater than zero
- user-assigned cards can only be assigned to the current user

## Updating Credit Cards

Only active credit cards can be edited. A canceled credit card is any card with `end_date` set.

When an active credit card is updated:

1. Card metadata is updated on the `credit_cards` row.
2. A `credit_card_limits` row is upserted for the card `start_date`.
3. The updated card is returned with its user assignment and limit history.

Updating a limit does not overwrite older limit records with different dates. This keeps historical limit changes available while preventing duplicate rows for the same card and date.

The edit form does not expose `start_date` or `end_date`. Canceled cards do not show the edit action, and the API rejects direct update requests for canceled cards.

## Canceling Credit Cards

Credit cards are canceled instead of deleted from the normal UI flow.

The `PATCH /households/:id/credit-cards/:creditCardId/cancel` endpoint accepts an `effectiveDate`.

When a credit card is canceled:

1. `credit_cards.end_date` is set to the effective date.
2. `credit_card_limits` rows after the effective date are removed.
3. `credit_card_balances` rows after the effective date are removed.

The effective date must be on or after the card `start_date`. Already canceled cards cannot be canceled again.

## Listing Credit Cards

The credit cards page loads cards from `GET /households/:id/credit-cards`.

The API returns cards that are either:

- assigned to the household
- assigned to the current user

The frontend can filter the returned list to active cards. A card is considered active only when `end_date` is null. Any card with `end_date` set is treated as canceled, even if the date is today or in the future.

Each returned card includes:

- card metadata
- assigned user details, when assigned to a user
- `currentLimit`
- full limit history, sorted newest first
- timestamps

## UI Behavior

The `/credit-cards` page supports:

- creating a card
- switching between household and member cards
- editing active card metadata
- changing an active card limit
- canceling an active card with an effective date
- showing active cards only

The create form asks for a due date, not a start date. The API derives the card start date from the due date and current date.

Canceled cards show a `Canceled` label. Canceled cards do not show edit or cancel actions.

## Timezone

Current-date behavior uses `SCHEDULING_TIMEZONE`, defaulting to `America/Chicago`.

This affects:

- the derived start date used when creating a card
- the date used when calculating `currentLimit`

Card due dates, start dates, end dates, and limit dates are stored as date-only values and are not converted between timezones.

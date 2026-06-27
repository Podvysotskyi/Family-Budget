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

`credit_card_id` and `date` are unique together. This means a credit card can only have one limit record for a given effective date.

When a user changes a card limit, the API writes a limit record with the requested effective date. If the limit is changed multiple times for the same card and same effective date, the existing row is updated instead of creating another row.

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
2. An initial `credit_card_limits` row is upserted using the submitted limit effective date.
3. The created card is returned with its user assignment and limit history.

The API validates:

- the current user belongs to the household
- the card name is present
- dates use `YYYY-MM-DD`
- `end_date`, when present, is on or after `start_date`
- the limit is greater than zero
- user-assigned cards can only be assigned to the current user

## Updating Credit Cards

When a credit card is updated:

1. Card metadata is updated on the `credit_cards` row.
2. A `credit_card_limits` row is upserted for the submitted limit effective date.
3. The updated card is returned with its user assignment and limit history.

Updating a limit does not overwrite older limit records with different dates. This keeps historical limit changes available while preventing duplicate rows for the same card and effective date.

## Closing Credit Cards

Deleting a credit card from the UI does not delete the database row.

The `DELETE /households/:id/credit-cards/:creditCardId` endpoint closes the card by setting `credit_cards.end_date` to the current date. This preserves card history, limit history, and balance history.

The current date comes from `SCHEDULING_TIMEZONE`, defaulting to `America/Chicago`.

## Listing Credit Cards

The credit cards page loads cards from `GET /households/:id/credit-cards`.

The API returns cards that are either:

- assigned to the household
- assigned to the current user

The frontend can filter the returned list to active cards. A card is considered active when `end_date` is null or `end_date` is today or later.

Each returned card includes:

- card metadata
- assigned user details, when assigned to a user
- `currentLimit`
- full limit history, sorted newest first
- timestamps

## UI Behavior

The `/credit-cards` page supports:

- creating a card
- editing card metadata
- changing a card limit with an effective date
- closing a card
- showing active cards only

The close confirmation tells the user that the action sets the card end date and keeps historical records intact.

## Timezone

Current-date behavior uses `SCHEDULING_TIMEZONE`, defaulting to `America/Chicago`.

This affects:

- the date used when closing a card
- the date used when calculating `currentLimit`

Limit effective dates submitted by the user are stored as date-only values and are not converted between timezones.

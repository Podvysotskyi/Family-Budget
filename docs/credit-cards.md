# Credit Cards

Credit cards model household cards and cards assigned to the current user. A credit card owns stable metadata, while limits and balances are stored as separate history tables.

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

## API Shape

The web app uses explicit ownership endpoints:

- `GET /households/:householdId/credit-cards`
- `GET /users/:userId/credit-cards`
- `POST /households/:householdId/credit-cards`
- `POST /users/:userId/credit-cards`
- `PATCH /credit-cards/:creditCardId`
- `PATCH /credit-cards/:creditCardId/cancel`
- `PATCH /credit-cards/:creditCardId/balance`

Household create/list endpoints require the current user to belong to the household. User create/list endpoints are for the current user's own cards.

Item-owned mutation endpoints do not receive a parent household id from the frontend. The API resolves the card, verifies household membership, and only allows mutations for unassigned household cards or cards assigned to the current user.

Credit card responses are intentionally lean:

- `id`
- `name`
- `user`, or null when no display assignee is returned
- `startDate`
- `endDate`
- `dueDate`
- `currentBalance`
- `currentLimit`

The response does not expose `householdId`, top-level `userId`, full limit history, full balance history, or timestamps. Ownership is determined by the endpoint and server checks, not by client-visible ids on the card response.

## Creating Credit Cards

When a credit card is created:

1. A `credit_cards` row is created.
2. `end_date` is set to null.
3. `start_date` is taken from the submitted `startDate`.
4. An initial `credit_card_limits` row is upserted using the submitted `startDate`.
5. An initial `credit_card_balances` row is upserted using the submitted `startDate` and `balance`.
6. The created card is returned as a lean `CreditCard` response.

The API validates:

- the current user belongs to the household
- the card name is present
- dates use `YYYY-MM-DD`
- the limit is greater than zero
- the balance is zero or greater
- user-assigned cards can only be assigned to the current user

## Updating Credit Cards

Only active credit cards can be edited. A canceled credit card is any card with `end_date` set.

When an active credit card is updated:

1. Card metadata is updated on the `credit_cards` row.
2. A `credit_card_limits` row is upserted for the card `start_date`.
3. The updated card is returned as a lean `CreditCard` response.

Updating a limit does not overwrite older limit records with different dates. This keeps historical limit changes available while preventing duplicate rows for the same card and date.

The edit form does not expose `start_date` or `end_date`. It submits the existing card `startDate` with the save payload so the API can upsert the limit for that date. Canceled cards do not show the edit action, and the API rejects direct update requests for canceled cards.

The edit assignment select is disabled when the household does not have multiple members. A null user assignment means the card belongs to the household.

## Updating Balances

The `PATCH /credit-cards/:creditCardId/balance` endpoint accepts:

- `date`
- `balance`

Only active cards can receive balance updates. The balance date must be on or after the card `start_date` and must not be in the future. The endpoint returns the saved balance row.

## Canceling Credit Cards

Credit cards are canceled instead of deleted from the normal UI flow.

The `PATCH /credit-cards/:creditCardId/cancel` endpoint accepts an `effectiveDate`.

When a credit card is canceled:

1. `credit_cards.end_date` is set to the effective date.
2. `credit_card_limits` rows after the effective date are removed.
3. `credit_card_balances` rows after the effective date are removed.

The effective date must be on or after the card `start_date`. Already canceled cards cannot be canceled again.

## Listing Credit Cards

The `/credit-cards` page loads household cards from `GET /households/:householdId/credit-cards`.

The household list returns household-assigned cards. User-assigned cards are shown on `/credit-cards/:userId` and loaded from `GET /users/:userId/credit-cards`.

The frontend can filter the visible list to active cards. A card is considered active only when `endDate` is null. Any card with `endDate` set is treated as canceled, even if the date is today or in the future.

## Frontend Store

`useCreditCardsStore` keeps household and user cards separate:

- `householdCreditCards: CreditCard[]`
- `userCreditCards: Record<string, CreditCard[]>`

The store exposes explicit fetch actions:

- `fetchHouseholdCreditCards(householdId)`
- `fetchUserCreditCards(userId)`

Mutation actions do not refresh list state implicitly. Components emit modal events and page-level refresh handlers call the correct fetch action for the active route.

List fetches use an abort controller. A new list request aborts the previous one, clears the target collection, suppresses toast feedback for aborted requests, and only resets `loading` when the request was not aborted.

## Frontend Components

The credit-card pages compose reusable components instead of a page shell:

- `/credit-cards` loads household cards and passes `user-id="null"` to the header.
- `/credit-cards/:userId` loads that user's cards and passes the route user id to the header.
- `CreditCardsPageHeader` owns navigation and `CreditCardCreateModal`.
- `CreditCardsPageList` owns list-only UI state such as the active-only switch.
- `CreditCardsPageListItem` owns row action modals: edit, update balance, and cancel.

Create/update/cancel/balance modals perform their own store mutation and emit `created` or `saved`. The component that owns the modal translates that to `refresh`, and the page performs the list fetch.

The create form asks for:

- name
- start date, defaulting to today
- due date, with a minimum of start date
- limit
- balance

The edit form asks for:

- name
- assignment
- due date
- limit

The update balance form asks for:

- date
- balance

The cancel form asks for:

- effective date

Canceled cards show a `Canceled` label. Canceled cards do not show edit or cancel actions.

## Timezone

Current-date behavior uses `SCHEDULING_TIMEZONE`, defaulting to `America/Chicago`.

This affects:

- the date used when calculating `currentLimit`
- the date used when calculating `currentBalance`
- future-date validation for balance updates

Card due dates, start dates, end dates, and limit dates are stored as date-only values and are not converted between timezones.

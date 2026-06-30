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

## API Shape

The web app uses explicit ownership endpoints for subscription management:

- `GET /households/:householdId/subscriptions`
- `GET /users/:userId/subscriptions`
- `POST /households/:householdId/subscriptions`
- `POST /users/:userId/subscriptions`
- `PATCH /subscriptions/:subscriptionId`
- `PATCH /subscriptions/:subscriptionId/cancel`

Household create/list endpoints require the current user to belong to the household. User create/list endpoints are for the current user's own subscriptions.

Item-owned mutation endpoints do not receive a parent household id from the frontend. The API resolves the subscription, verifies household membership, and only allows mutations for unassigned household subscriptions or subscriptions assigned to the current user.

Subscription responses are intentionally lean:

- `id`
- `name`
- `user`, or null when no display assignee is returned
- `type`
- `startDate`
- `endDate`
- `nextChargeDate`
- `amount`
- `autopay`

The response does not expose `householdId`, top-level `userId`, full amount history, full due-date history, or timestamps. Ownership is determined by the endpoint and server checks, not by client-visible ids on the subscription response.

Budget views still use the budget occurrence endpoint:

- `GET /user/:userId/subscriptions?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD`

## Creating Subscriptions

When a subscription is created:

1. A `subscriptions` row is created.
2. An initial `subscription_amounts` row is created using the subscription `start_date`.
3. `subscription_due_dates` rows are created from `start_date` through the current active month.
4. The submitted due date replaces the generated due date in its billing period.

If the subscription starts in the past, this creates records for previous months through the current month.

The API validates:

- the current user belongs to the household
- the subscription name is present
- dates use `YYYY-MM-DD`
- the due date is on or after the start date
- the amount is greater than zero
- user-assigned subscriptions can only be assigned to the current user

## Updating Subscriptions

Only active subscriptions can be edited. A canceled subscription is any subscription with `end_date` set.

When a subscription is updated:

1. Subscription metadata is updated on the `subscriptions` row.
2. The requested amount is compared with the effective amount for today.
3. If the amount changed, `subscription_amounts` is upserted for today.
4. `subscription_due_dates` are ensured through the current active month.
5. If an `end_date` is set, future subscription dates and transactions after that date are removed.

Changing an amount no longer closes the old subscription and creates a replacement subscription.

The edit form does not expose `start_date` or `end_date`. It submits the existing subscription `startDate` with the save payload. Cancellation owns `end_date` changes through the cancellation endpoint.

The edit assignment select is disabled when the household does not have multiple members. A null user assignment means the subscription belongs to the household.

## Canceling Subscriptions

Subscriptions are canceled by setting `end_date`; they are not deleted from the normal UI flow.

The `PATCH /subscriptions/:subscriptionId/cancel` endpoint accepts:

- `effectiveDate`

When a subscription is canceled:

1. `subscriptions.end_date` is set to the selected effective date.
2. Future subscription dates after that date are removed.
3. Future subscription transactions after that date are removed.

The effective date must be on or after the subscription `start_date`. Already canceled subscriptions cannot be canceled again.

## Listing Subscriptions

The `/subscriptions` page loads household subscriptions from `GET /households/:householdId/subscriptions`.

The household list returns household-assigned subscriptions. User-assigned subscriptions are shown on `/subscriptions/:userId` and loaded from `GET /users/:userId/subscriptions`.

The frontend can filter the returned list to active subscriptions. A subscription is considered active only when `end_date` is null. Any subscription with `end_date` set is treated as canceled, even if the date is today or in the future.

Canceled subscriptions show a `Canceled` label and do not show edit, cancel, or delete actions. The subscriptions page does not expose a delete action.

## Frontend Store

`useSubscriptionsStore` keeps household and user subscriptions separate:

- `householdSubscriptions: Subscription[]`
- `userSubscriptions: Record<string, Subscription[]>`

The store exposes explicit fetch actions:

- `fetchHouseholdSubscriptions(householdId)`
- `fetchUserSubscriptions(userId)`

Mutation actions do not refresh list state implicitly. Components emit modal events and page-level refresh handlers call the correct fetch action for the active route.

List fetches use an abort controller. A new list request aborts the previous one, clears the target collection, suppresses toast feedback for aborted requests, and only resets `loading` when the request was not aborted.

## Frontend Components

The subscription pages compose reusable components instead of a page shell:

- `/subscriptions` loads household subscriptions and passes `user-id="null"` to the header.
- `/subscriptions/:userId` loads that user's subscriptions and passes the route user id to the header.
- `/subscriptions/household` redirects to `/subscriptions` for compatibility with the previous route.
- `SubscriptionsPageHeader` owns navigation and `SubscriptionCreateModal`.
- `SubscriptionsPageList` owns list-only UI state such as the active-only switch.
- `SubscriptionsPageListItem` owns row action modals: edit and cancel.

Create/edit/cancel modals perform their own store mutation and emit `created` or `saved`. The component that owns the modal translates that to `refresh`, and the page performs the list fetch.

The create form asks for:

- name
- amount
- type
- start date, defaulting to today
- due date, defaulting to today and with a minimum of start date
- optional end date, with a minimum of start date
- autopay

The edit form asks for:

- name
- assignment
- amount
- type
- next due date, with a minimum of start date
- autopay

The cancel form asks for:

- effective date

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
3. Next subscription due-date rows are advanced for subscriptions whose latest persisted due date is on or before the current scheduler date.

Every hour:

1. Budget periods are ensured.
2. At midnight in the scheduling timezone, active budget periods are synced.
3. At midnight, next subscription due-date rows are advanced for subscriptions whose latest persisted due date is on or before the current scheduler date.
4. At midnight, autopay subscriptions due on the current date are paid.

The scheduler does not pre-fill all subscription due dates through the active month. It stops once each subscription has one future due-date row, so the next due date is only created after the previous due date has happened.

Autopay only selects subscriptions that:

- have `autopay = true`
- are active for the current date
- have a `subscription_due_dates` row for the current date

The autopay transaction amount is the amount effective on the current date.

## Timezone

Current-date behavior uses `SCHEDULING_TIMEZONE`, defaulting to `America/Chicago`.

This affects:

- the date used for same-day amount upserts
- the current scheduler date used when advancing next subscription due dates
- the date used by autopay

## Migration Notes

The subscription history migration:

1. Creates `subscription_amounts`.
2. Creates `subscription_due_dates`.
3. Backfills `subscription_amounts` from the old `subscriptions.amount` column using `subscriptions.start_date`.
4. Backfills `subscription_due_dates` from existing subscription recurrence rules through the current month.
5. Drops `subscriptions.amount`.

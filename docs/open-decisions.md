# Open decisions

Only questions that are still open. Approved rules live in the requirement documents; resolved questions are recorded in [Decision history](decision-history.md). Listing a question here does not select any option.

The [Technical design](technical-design.md) provides concrete draft recommendations for these questions. Review its [technical and business proposal register](technical-design.md#22-review-register); these questions remain open until the user confirms the applicable choices. Provider identity/household isolation, pending-to-posted reconciliation, and consent mechanics additionally need provider evidence, not just a design preference.

## Design proposals awaiting confirmation

These are on the [design canvas](ui-design.md) and in the exports, but go beyond the approved rules. Confirm, change or reject each:

1. **Website:** the public landing page is not in the written requirements. Approve its scope, copy and the bank-coverage wording.
2. **Budget summary:** the "Remaining in targeted categories" and combined over-target figures are design-level totals, not budget rules.
3. **Removing a bank connection** keeps its accounts on Accounts, marked "Disconnected".
4. **Turning off a loan's schedule** removes its unpaid installments from the calendar; paid installments and extra payments stay and the balance doesn't change.
5. **Manual transactions** use a Money out / Money in toggle with a positive amount.
6. **Deleting a household** requires typing its name.
7. **Investments** shows quantity, price, value, gain vs cost and cash per holding, plus buy/sell/dividend activity.
8. **First-run Home** shows a shared "Get set up" checklist that any member can hide.
9. **Busy calendar days** show three items (overdue first) and "+N more".
10. **Default subcategory names** in [Categories](product-requirements.md#categories) are a proposal.

## Budget

1. Transaction-date handling and the remaining spending-eligibility details, including duplicate prevention between pending/posted transactions and between transactions and attached scheduled records.
2. How transfers between household accounts and credit-card repayments are identified.
3. Investment purchase/sale designation: correcting or removing it, and precedence over later provider data. Mapping provider classifications.

## Categories

1. How provider-suggested categories map to a household's renamed or deleted categories.

## Households and access

1. Presentation of nickname reassignment, repeated nicknames and a returning member on preserved records.
2. Stale or canceled invitation feedback, Google email changes, and rejoining a former household.
3. What an open page or modal does when access changes mid-edit (removal, household deletion, ownership transfer), without exposing the former household's data.

## Accounts and transactions

1. **Credit-card calendar bills:** an occurrence before the statement amount is known (summaries, reminders, matching); how card setting changes, switches and card deletion update or stop generated bills; avoiding duplicates. See [bill lifecycle](accounts-and-transactions.md#credit-card-calendar-bill-lifecycle).
2. **Calculations with missing data:** missing/zero card limits, usage above 100%, credit or surplus balances, mixed known/unknown group limits, balance-history start, granularity, gaps and stale values. See [calculation coverage](accounts-and-transactions.md#calculation-coverage-and-missing-data).
3. **Loan balances:** reconciling repayments with directly entered balances, manual Loan transactions and provider imports, without double counting; schedule recalculation when cadence changes alongside paid installments.
4. **Investments:** valuation, history granularity, and how trading activity relates to Transactions (see proposal 7).
5. Whether the provider supplies credit limits, so limit changes could be recorded automatically.
6. Subscription "a month" equivalents for non-monthly schedules, price changes and cancellation, and the date basis for "paid this year" and the payments chart.

## Matching

1. Detailed similarity scoring, tie handling and sign normalization between provider and manual transactions.

## Connections and provider

1. Lunch Flow coverage for each requested institution and account type; the Apple Card route if not covered.
2. Platform pricing, rate limits, available history, holdings and trading data.
3. Sync scheduling and concurrency mechanics, rate-limit handling, and storage of sync status and errors.
4. Provider identifiers, pending-to-posted mapping, removal signals and correction mechanics.
5. Account discovery, date filtering and backfill support.
6. Consent, token, expiry, reauthorization and disconnect/revocation mechanics behind the designed Reconnect and Remove flows.

## Behavior to specify before building

1. Unsaved-change handling (Cancel, close, backdrop, navigation, payment switching), modal scroll/footer rules and nested modals.
2. How an edit started from a series list chooses the occurrence anchoring "this occurrence" and "all future".
3. Calendar member filters (not designed).
4. Notification destinations for deleted or inaccessible records.
5. How components are documented without a catalog tool (see [Component library](component-library.md#open-questions)).

## Product and delivery

1. App name.
2. Accessibility target and supported browsers/devices.
3. Any app subscription or pricing model (the app paying provider costs does not decide what users pay).
4. Exact versions and dependencies for the approved stack.
5. Application architecture and database schema, including history, soft deletion and member associations.
6. Google authentication integration and session handling.
7. USD representation, date storage, recurrence processing, reminder scheduling and duplicate-delivery prevention.
8. Redis responsibilities, queues and job retry behavior (temporary sync failures are not retried automatically).
9. Data retention, backups, recovery, monitoring and hosting.
10. Test tools, acceptance criteria, implementation phases and release process.

Implementation begins only after the user reviews and approves the remaining plan.

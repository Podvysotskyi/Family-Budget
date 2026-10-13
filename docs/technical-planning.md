# Technical planning

The [full technical design draft](technical-design.md) now proposes the architecture, logical schema, money/date contracts, authorization, recurrence, loan and Budget algorithms, provider synchronization, notifications, frontend contracts, Redis responsibilities, operations, testing, and implementation phases. Its [review register](technical-design.md#22-review-register) separates proposed technical decisions from unresolved product behavior. This document continues to record the approved stack/provider and earlier research; drafting a proposal does not approve it or authorize implementation.

## Approved technology stack

| Technology | Approved |
| --- | --- |
| Laravel | Yes |
| Inertia | Yes |
| Vue 3 | Yes |
| TypeScript | Yes |
| Tailwind CSS | Yes |
| PostgreSQL | Yes |
| Redis | Yes |

The user selected this stack. Exact versions, architecture, deployment topology, and Redis responsibilities have not been approved.

### Frontend component decisions (October 3, 2026)

| Topic | Decision |
| --- | --- |
| UI components | Own reusable Vue 3 + Tailwind component library; no headless UI library. See [Component library](component-library.md). |
| Category picker | Searchable combobox |
| Date picker | Own implementation |
| Charts | Chart.js through the vue-chartjs wrapper |
| Component catalog | None (Storybook was chosen, then dropped) |

Other package choices remain unapproved.

Google-only authentication, USD-only amounts, UTC timestamps, and calendar dates that remain the same for every user are approved requirements. Their technical implementation remains to be planned.

## Planned financial provider

**Lunch Flow Platform API** was explicitly approved. The app pays provider costs. Connections, accounts, imported data, and all household financial records belong to the household and may additionally be associated with a member.

Members changing households do not take financial records or connections with them. All records stay in the original household and remain visible/editable by current members. No public/private record model exists. Connections continue syncing after their authorizing member leaves while provider authorization remains valid. Consent/token mechanics, invalid authorization, and reauthorization still require planning and provider validation.

Do not substitute Lunch Flow's Personal API or Lunch Money's API without a new decision. Google app login and provider/bank authorization serve different purposes; selecting Google-only authentication does not remove the need to authorize a financial connection.

### Prior research context

The following links were discussed during the planning conversation. They are recorded for traceability and have not been reverified as part of writing this documentation.

| Topic | Source and relevance |
| --- | --- |
| Lunch Flow Platform API | [Platform API overview](https://www.lunchflow.app/docs/api/platform-api-overview) describes platform integration for users, connections, transactions, balances, and holdings |
| Lunch Flow providers | [What is Lunch Flow?](https://www.lunchflow.app/docs/api/what-is-lunch-flow) describes its provider approach, including banking and brokerage integrations |
| US/Canada connections | [Regional connection guide](https://www.lunchflow.app/docs/guides/connections/regions/us-canada) provides connection context |
| Account retrieval | [Platform account endpoint](https://www.lunchflow.app/docs/api/platform-api/platformListAccounts) is a starting point for API validation |
| Lunch Flow pricing | [Lunch Flow website](https://www.lunchflow.app/) distinguishes personal product pricing from platform arrangements; platform costs were not established |
| Lunch Money restrictions | [Lunch Money API terms](https://lunchmoney.app/terms-api) raised concerns about using its API as the foundation for a replacement finance app |
| Lunch Money imports | [Automatic imports guide](https://support.lunchmoney.app/guides/automatic-imports) was consulted when discussing banking and investment coverage |
| SimpleFIN alternative | [Developer information](https://beta-bridge.simplefin.org/info/developers) and [protocol](https://www.simplefin.org/protocol.html) were reviewed as an alternative |
| Plaid alternative | [Transactions documentation](https://plaid.com/docs/transactions/), [Investments documentation](https://plaid.com/docs/investments/), and [billing documentation](https://plaid.com/docs/account/billing/) were reviewed |
| Apple FinanceKit | [Apple FinanceKit](https://developer.apple.com/financekit/) was considered; it is not a direct web-app import API |
| Apple Card exports | [Apple support](https://support.apple.com/en-us/102284) was considered as potential fallback context; no export/import workflow was selected |

### Synchronization research on October 2, 2026

Every household member is approved to use **Sync now**, available immediately after an attempt finishes with no app-imposed cooldown. The user selected **hourly automatic synchronization** after reviewing the findings below. Hourly sync retrieves the latest available Lunch Flow data; it does not guarantee hourly bank-data refreshes. Requests for a connection already syncing reuse its running sync. Temporary sync failures do not trigger automatic retries, and failures do not send in-app notifications. Connection details show the last successful sync time and latest error. The connection's last-success time updates only when all its accounts succeed in that sync. Each account has its own last-success time, and its displayed error clears after its next successful sync. Partial syncs keep successful updates and identify failed accounts. Scheduling/concurrency mechanics, provider rate-limit handling, technical storage, and whether Sync now can request a new bank fetch remain unselected.

- Lunch Flow's [QuickStart guide](https://www.lunchflow.app/docs/guides/get-started/quickstart) describes daily automatic transaction updates. This does not establish a maximum Platform API polling frequency or guarantee that more frequent reads obtain fresh bank data.
- Its [API integration page](https://www.lunchflow.app/features/api-integration) refers to generous rate limits without a numeric quota. The reviewed [Platform API overview](https://www.lunchflow.app/docs/api/platform-api-overview) and account reference do not specify requests per minute/day. Exact Platform API limits, their scope, and rate-limit responses remain unverified.
- The provider's roadmap lists [Trigger a sync via the API](https://feedback.lunchflow.app/p/trigger-a-sync-via-the-api) as Planned. A forced bank refresh is therefore not a confirmed API capability; reading available data and forcing a new bank fetch must be distinguished during planning.
- A [rate-limit feedback request](https://feedback.lunchflow.app/p/document-rate-limit-handling-and-implement-retry-after-headers) reports upstream throttling and requests documented retry handling. This is user-submitted feedback, not a contractual quota or verified limit for our US connections.

Hourly automatic synchronization is the approved cadence. Before implementing it and finalizing Sync now behavior, confirm the Platform API polling quota, bank-data refresh frequency, forced-refresh availability, rate-limit/failure guidance, and any additional refresh costs. Temporary sync failures must not trigger automatic retries under the approved policy. No provider was contacted and no refresh implementation was selected by this research; the hourly cadence was separately approved by the user.

### Provider validation still required

- Verify every requested institution and account type, including Apple Card and the requested brokerages.
- Verify the actual availability of holdings and investment trading activity through the selected API.
- Establish platform pricing, connection limits, rate limits, and commercial terms.
- Confirm provider account discovery, history availability, date-filtering support, and backfill mechanics. Each connected account has its own inclusive import starting date. Initial setup defaults to the first day of the current month in the setup member's profile timezone; later-discovered accounts import automatically from their UTC discovery calendar date without member confirmation. Moving a starting date later preserves already-imported transactions, including those before the new date. Moving it earlier automatically imports available older transactions on the next sync, including the new starting date. Apply persistent soft-deletion rules during backfill; deleted transactions must not be restored. The default-date timezone rules are approved; detailed form presentation and technical storage remain unselected.
- Confirm balance semantics, pending/posted transactions, identifiers, corrections, and deletions.
- Provider-supplied pending transactions must appear with a Pending label. Pending and posted transactions are both eligible for attachments and matching suggestions under existing eligibility rules. On posting, retain one app transaction and preserve its notes, category, hidden setting, and attachments. Sync automatically applies provider corrections to amount/date/payee while retaining previous values in change history; household members still cannot edit those imported fields. Provider support, identifiers, transition mapping, duplicate prevention, and correction mechanics require validation and technical planning.
- Confirm sync methods, connection errors, reauthorization, and provider availability behavior.
- Resolve Apple Card integration if the provider cannot supply it.

No provider account was created, connection tested, financial data accessed, trial started, or provider costs incurred during planning.

## Technical areas awaiting decisions

These are planning topics, not approved implementations:

| Area | Decisions still needed |
| --- | --- |
| Application structure | Architecture, domain boundaries, and organization within the selected stack |
| Software versions | Supported versions and compatibility of the stack and dependencies |
| Authentication | Google integration package, sign-in/onboarding flow, sessions, and email/invitation matching |
| Data model | Household/member/user relationships; schedules and occurrences; loans; accounts; history and attachments |
| Household isolation | Authorization and access checks, especially after membership changes |
| Money representation | Storage and rounding conventions for USD amounts |
| Date handling | Date-only schedule representation, UTC timestamps, recurrence calculations, and timezone reminders |
| Redis | Queue, cache, session, locking, or other roles |
| Provider integration | Token handling, synchronization, rate limits, failure handling, and reconciliation; reuse running syncs per connection and do not automatically retry temporary sync failures |
| Budget functionality | Actual transactions dated in the month provide category spending; include pending/posted and exclude transfers between household accounts, hidden transactions, and soft-deleted transactions without duplicate counting. Transfers Between Accounts category excludes a transaction even without an imported counterpart. Targets are monthly USD limits with spent/remaining/over-target figures; Remaining equals target minus Spent without clamping. Remaining inclusion rules, transfer identification/classification details, Over target indicator details, layout, and implementation remain unselected |
| Budget refunds and uncategorized spending | Income-category and uncategorized incoming transactions are excluded; uncategorized incoming transactions do not reduce the Uncategorized total. Eligible incoming expense-category transactions automatically reduce their category's spending in their own transaction month, like refunds, without requiring a separate refund designation. Spent displays a negative amount when refunds exceed expenses, and Remaining can exceed a configured target. Eligible uncategorized expenses appear in an Uncategorized reporting group, count toward total spending, and cannot have a target. Provider amount-sign mapping remains unselected |
| Budget loan and card repayments | Eligible outgoing Loan Payments transactions count the full amount, including principal, interest, and fees, unless classified as transfers; no Budget component split. Credit-card repayments are transfers for Budget and excluded. Scheduled payments do not create additional transaction-based spending. Repayment identification, transfer classification details, and loan balance reconciliation implementation remain unselected |
| Budget investment trades and target enforcement | Investment purchases and sales are excluded from budget spending. All current members can manually designate investment purchases/sales when the provider has not identified them. Separately recorded investment fees assigned to expense categories count as spending, subject to eligibility rules; embedded-fee splitting is not approved. Targets are informational: totals and alerts do not block transaction entry or other actions when exceeded or initiate automatic financial actions. Designation correction/removal, sync precedence, provider classification mapping, and implementation remain unselected |
| Budget navigation and alerts | Dedicated Budget section opens to the current UTC month, supports browsing previous/future months, and shows contributing transactions when a category is clicked for the selected month. In-app notification to all current household members when spending exceeds a current-month category target. Use UTC calendar months and alert once per category per month, even after another crossing. Any change putting spending over target can trigger the first alert, including imports, manual transactions, recategorization, and target reductions. Detailed controls, layout, and implementation remain unselected |
| Optional category targets | Targets are optional for expense categories only; nonnegative USD amounts including $0 are allowed. Income/transfer categories and Uncategorized cannot have targets. Untargeted categories show spending and a No target label, with dashes for Remaining and Over target. An expense category appears if it has a target or contributing transactions in the selected month, including when transactions net to $0. Add target allows any expense category, including one absent from the view, subject to past-month target locks. Form details, storage, and implementation remain unselected |
| Category target repetition | Targets repeat monthly until changed, with This month only and This month and all future months scopes for edits and removal; unused budget and overspending do not carry over or alter next-month targets. Past-month targets cannot be added/edited/removed, using UTC month boundaries; future-scoped edits replace existing individual overrides in that range. Historical spending continues to update after transaction imports/changes under eligibility rules. Storage and implementation remain unselected |
| History | Soft deletion, change history, financial snapshots, and retention |
| Interface | Component choices, calendar implementation, and accessibility |
| Credit-card generated bills | Unknown statement amounts; conditional validation; setting changes, switch disable/re-enable, direct bill edits, card deletion, duplicate prevention, and preservation of completed occurrences; see [bill lifecycle](accounts-and-transactions.md#credit-card-calendar-bill-lifecycle) |
| Financial chart coverage | Missing/zero card limits, mixed-limit group usage, credit balances, historical coverage/granularity, missing/stale values, account additions/removals, and subscription monthly-equivalent/date-basis rules; see [calculation coverage](accounts-and-transactions.md#calculation-coverage-and-missing-data) |
| Interaction and changing access | Save/autosave, unsaved modal edits, occurrence context, ordinary-member states, stale invitations, and access revocation while requests/pages/modals are active; see [UI design](ui-design.md#behavior-to-specify-before-building) |
| Testing | Test tools and coverage for approved business rules and authorization |
| Operations | Hosting, environments, deployments, backups, monitoring, and recovery |
| Delivery | Implementation phases, milestones, and acceptance/release criteria |

Hourly automatic synchronization is approved. No database schema, queue implementation, calendar library, authentication package, or hosting provider is selected by this document.

## Business behavior to verify during implementation

The future validation plan should cover the approved rules. The [acceptance scenarios](ui-design.md#acceptance-scenarios) provide concrete expected outcomes for recurrence, scoped changes, matching, repayment, cancellation, transactions, Budget, permissions, and sync. Exact test tools, automated test organization, and release criteria remain unselected. Add acceptance cases for currently open calculations/lifecycles only after their business rules are selected.

- One active household per user. All members can edit household/member details. Member creation/removal, invitations, ownership transfer, and household deletion remain owner-only.
- Allow multiple pending invitations from the same household to the same Google email; accepting one automatically cancels the other pending invitations from that household to that email. Preserve the one-active-household-per-user rule.
- Assignment displays use household nicknames, including preserved records after departure/removal. Ownership transfers immediately, without recipient approval, only to another current household member with a linked Google account; reject unlinked recipients and revoke the previous owner's owner permissions on transfer.
- All household financial records are household-owned, with optional member association. All current members can view/edit them; no public/private settings or member-exclusive editing exists. Imported source amount/date/payee remain read-only. Category definitions are household-owned and editable by all members.
- All members can view/create/edit/delete financial records/accounts/connections, directly update manual balances, edit transaction notes/categories and loan records, and edit member details. Owner-only administrative actions remain as defined above. Existing source-field restrictions, manual-entry limits, soft deletion, and history retention still apply. User-deleted imported transactions are soft-deleted and later syncs must not recreate or restore them. Persistent transaction identification and deletion handling require technical planning.
- Loan accounts are listed in both Loans and Accounts. Optional repayment configuration is inside the loan. Paid installments/extra payments update the household Loan account balance; reversals/corrections recalculate it with history retained. Reconciliation with manual/provider updates remains open.
- Member departure preserves all original household records, including accounts, transactions, balances, loan schedules, paid/unpaid occurrences, account selections, and attachments. Remaining members retain viewing/editing access. Departing members lose household access; there is no automatic cross-household financial migration.
- Categories are household-owned, seeded from a default list that includes subcategories, with one level of subcategories and built-in Transfers Between Accounts and Loan Payments categories. Budget targets exist only on top-level expense categories. Deleting requires a replacement and re-points all records. Budget rolls subcategory spending into top-level categories. Assignments and hidden flags stay with household records. Hidden status is a shared display filter with Show hidden, not private access.
- Require household setup after Google sign-in before normal app pages/actions, including Profile. Users without an active household must create one or accept an invitation to join one; both paths are available through onboarding. Apply the same access gate after departure/removal/household deletion without restoring former household access. Existing one-active-household and owner-leaving rules still apply. The setup screens are designed; technical enforcement remains unselected. The earlier personal financial pages and personal syncing without a household are superseded.
- Household connections continue syncing after authorizing-member departure while provider authorization is valid. Soft-deleting a household stops synchronization and disconnects bank connections, preserving imported history. Automatic synchronization is hourly and all members can use Sync now without an app-imposed cooldown after an attempt finishes. Additional requests reuse a connection's running sync; temporary failures do not trigger automatic retries, and failures do not send in-app notifications. Connection details show the last successful sync time and latest error. Partial syncs preserve successful account updates and identify failed accounts. The connection's last-success time updates only when all its accounts succeed in that sync; each account has its own last-success time. An account's displayed error clears after its next successful sync. Provider consent/token behavior, expired/revoked authorization, reauthorization, scheduling/concurrency mechanics, provider rate-limit handling, technical storage, and disconnect/revocation mechanics still require planning and validation.
- Shared records retain change history with actor, time, and previous/new values. History storage, event coverage, and integrity still require planning (the view is designed); no audit library/schema is selected.
- Same scheduled calendar dates across timezones and UTC timestamps.
- Due-date reminders skip already-paid occurrences; newly added items do not trigger immediate catch-up reminders after a recipient's reminder time has passed.
- Rescheduling a due date or reminder settings allows another reminder at the updated scheduled date/time for the same occurrence; distinguish this from duplicate delivery of an unchanged scheduled reminder.
- Existing unpaid items due today trigger immediate catch-up after recipient additions or schedule changes whose relevant scheduled time has passed; newly created late items do not.
- Moving an existing item's due date to a past calendar day does not trigger an immediate reminder.
- Daylight saving gaps move reminders to the next valid local time; repeated local times deliver a scheduled reminder once at the first occurrence.
- Notification controls support read/unread, Mark all as read, automatic marking on open, and dismissal with history retained indefinitely.
- Recurrence fallback dates, two separate occurrences when twice-monthly dates share a last-day fallback, inclusive optional end dates for bills/income, and occurrence-specific changes.
- Future-series edits preserve paid/received occurrences and replace individual overrides on incomplete future occurrences only for the fields actually changed.
- Due-date-based monthly/weekly totals independent of calendar filters.
- Actual payment/received dates default to today and remain editable; changing them does not change scheduled/due-date-based summary grouping.
- Overdue unpaid items show an Overdue label without moving their original calendar date.
- Explicit completion status independent of attached transaction totals.
- Match suggestions consider only selected accounts; no selected accounts produces no suggestions, and hidden transactions remain excluded. Use amount, date, and payee similarity to the bill/income name within the inclusive window from seven days before through seven days after the occurrence's scheduled date. Require an exact match to the occurrence amount; exclude different-amount/partial-payment suggestions. Bill/subscription/loan-payment suggestions use outgoing transactions; income suggestions use incoming transactions. Date proximity has priority over payee/name similarity among exact-amount matches. Matching suggestions have no dismiss option. Detailed similarity scoring, tie handling, provider/manual sign normalization, and matching implementation remain unselected. Manual attachments remain independent of suggestion amount/date/direction restrictions.
- Manual attachments permit any accessible transaction, including from unselected accounts or when no accounts are selected, while preserving account access checks and the one-non-deleted-occurrence attachment rule.
- Matching suggestions remain available for paid bills and received income. Show only the top five ranked suggestions, with no Show more and no pagination; other transactions can still be found and attached manually.
- Soft-deleted occurrences retain transaction attachments without preventing reuse on another non-deleted occurrence. Soft-deleted manual and imported transactions retain existing attachments for history, but deleted transaction details are not displayed through them. Provider-reported transaction removals also soft-delete the transaction, preserving history and attachments. Provider removal signals and identity tracking require validation; absence from a limited sync response does not establish removal. The design shows them as a "Deleted transaction" placeholder.
- All household accounts are eligible for scheduled selection, and names are visible to all members. Account deletion clears selection relations; member departure alone does not. Account deletion preserves attached transaction history under the approved soft-deletion rules.
- Account selection and ordinary bill/subscription paid or income received status do not alter account balances. Loan repayments update their Loan account balance automatically, with history retained; scheduled status changes do not debit selected paying accounts. Manual/provider loan update reconciliation must prevent double-counting under a separately approved rule.
- Loan extra payments, reduced final installments, and paid/unpaid balance changes.
- Extra payment corrections and soft deletions recalculate loan balances and unpaid installments while preserving history.
- Reject reductions of a loan's repayment total below the amount already paid; allow equality, which leaves a zero remaining balance.
- Manual transaction creation balance option, with no automatic edit/delete reversal.
- Soft deletion with preserved history and no restore interface.
- Subscription effective-date cancellation preserves paid occurrences on or after the cutoff; changing one of those occurrences to unpaid soft-deletes it while retaining history and attachments.
- Subscription deletion soft-deletes the subscription and every occurrence, including paid occurrences, retaining history and attachments with no restore.

## Implementation readiness

Every approved section has designed screens on the canvas, exported to [docs/design](design/) and described in [UI design](ui-design.md). The design shows intended behavior; it was not run as an app, and provider capabilities and pricing were not revalidated.

Before treating the plan as an implementation specification:

- Confirm or change the [design proposals](open-decisions.md#design-proposals-awaiting-confirmation).
- Resolve the open business rules that affect data and calculations: credit-card bill lifecycle, calculations with missing data, loan balance reconciliation, and Budget classification (see [Open decisions](open-decisions.md)).
- Choose the accessibility target and supported browsers, then verify keyboard, focus, dialogs, charts and failed saves in the built app.
- Revalidate provider coverage, credentials and authorization, quotas, history, and transaction identity and removal signals. Sample institutions in the design are not evidence of provider support.

This checklist does not select a schema, library, deployment or milestone, and does not authorize coding.

## Implementation gate

The user requested planning before implementation and approval of every decision. Continue planning and seek approval for unresolved choices. This documentation is a requirements record, not approval to scaffold the application or begin coding.

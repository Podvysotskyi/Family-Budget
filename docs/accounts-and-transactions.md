# Accounts and transactions

## Household ownership and access

All household financial records belong to the household: connections, connected/manual accounts, balances and balance history, transactions, investments, loans, schedules, payments, and attachments. Records may additionally be associated with a household member for organization.

- All current household members can view and edit all household records.
- There are no public/private account or record settings.
- Optional member association does not create personal ownership, exclusive access, or exclusive editing rights.
- Records stay in their household when a member leaves or joins another household. The departing member loses household access.
- All household members can create, edit, and delete household financial records, accounts, and connections. Existing source-field restrictions, manual-entry limits, soft deletion, and history-retention rules still apply. Member creation/removal, invitations, household ownership transfer, and household deletion remain household-owner-only.
- Google authentication and profile settings retain their user-level behavior. Category definitions belong to the household; all members can manage them.

This replaces the earlier user-owned, portable account/connection model and the private-account permission model.

## Financial connections

- The planned provider is **Lunch Flow's Platform API**.
- The app pays provider costs.
- Connections belong to the household and may also be associated with a member.
- Connections and imported data do not move with that member to another household.
- All household members can edit connection configuration and household account settings. Each connected account has its own inclusive import starting date. Initial setup defaults to the first day of the current month in the setup member's profile timezone; accounts discovered later import automatically from their UTC discovery date. The import-date screens are designed (Connect a bank, Connection details).
- All current household members can create and delete household connections.
- Automatic synchronization runs **hourly**, retrieving the latest available Lunch Flow data. This does not guarantee hourly bank-data refreshes; Platform API quotas and refresh capabilities still require validation.
- Every current household member can use **Sync now**. It is available immediately after a sync attempt finishes, with **no app-imposed cooldown**. Provider-enforced limits still apply; provider refresh capabilities and rate-limit mechanics require validation.
- If a connection is already syncing, additional requests reuse the running sync instead of starting another concurrent sync for that connection. The technical mechanism remains unselected.
- Temporary sync failures do **not** trigger automatic retries. Sync failures do **not** send in-app notifications to household members. The normal hourly schedule and member-requested Sync now remain approved; invalid-authorization handling still requires planning.
- Connection details show the **last successful sync time** and **latest error**. The connection's last-success time updates only when **all its accounts succeed in that sync**; partial success does not update it.
- When some accounts sync successfully and others fail, keep the successful updates and identify the failed accounts. Each account has its own last-success time, updated after its successful sync. An account's displayed error clears after its next successful sync. The connection screens are designed; technical storage remains unselected.
- Previously imported history is preserved. Removing a connection preserves imported history.
- Bank authorization may involve a real user's consent. Household connections **continue syncing after the authorizing member leaves**, provided provider authorization remains valid. Departure alone does not stop sync. Provider authorization validation, expired/revoked consent, and reauthorization still require planning.
- Soft-deleting a household stops synchronization and disconnects its bank connections, while preserving imported history. The provider disconnect/revocation mechanics still require validation and technical planning.
- The earlier personal-connection reuse, new-import-date-on-household-move, and personal syncing without household membership rules are superseded.

A household retains all its financial records after member departure; visibility no longer depends on retaining a scheduled-record attachment. Joining another household does not bring the original household's connections or data.

## Import starting dates

- Each connected account has its **own import starting date**, rather than one shared date for all accounts in a connection.
- For initial account setup, the default starting date is the **first day of the current month**, determined using the **profile timezone of the member setting up the account**.
- Accounts discovered later in an existing connection import automatically from their **UTC discovery calendar date**, without waiting for a member to confirm a starting date. This date is the account's import starting date and remains editable under the shared account-setting rules.
- The starting date is **inclusive**: transactions dated on that day are included.
- Moving an account's import starting date later **does not remove already-imported transactions**, including transactions dated before the new starting date.
- Moving the date earlier causes the **next sync** to automatically import older transactions available from the provider, starting on the newly selected date. Existing soft-deletion persistence rules still apply; this does not restore deleted transactions.
- This is an account-level import setting, not a household-migration workflow. Accounts and their history remain in their original household.

The import-date screens are designed (Connect a bank, Connection details). Provider account discovery, filtering/history availability, and backfill mechanics require validation and technical planning. The default date and its timezone, automatic importing of later-discovered accounts from their UTC discovery date, inclusivity, and the behavior when moving the date earlier or later are approved.

## Requested institutions and data

The user is in the USA and uses Apple Card, Chase, PenFed, Robinhood, Acorns, Schwab, Wells Fargo, Capital One, Discover, and Amex.

The app should support both:

- Banking/card transactions and balances.
- Investment holdings and trading activity.

The user reported that most of these institutions work in their existing Lunch Money setup. That does not verify Lunch Flow coverage or reliability. Exact coverage and the Apple Card import route still require validation.

## Accounts

- Connected and manual accounts belong to their household.
- Accounts may also be associated with a household member.
- All household members can view accounts, balances, balance history, transactions, and investment data and edit household record fields.
- All household members can edit manual account details and directly update manual balances; the earlier account-owner-only editing restriction is superseded.
- There is no visibility field, private default, private-name masking, or visibility-change workflow.
- Accounts, history, category assignments, and hidden flags remain in their household when an associated member leaves.

### Accounts page grouping and history chart

Approved on October 3, 2026 during UI design review:

- The Accounts page groups accounts by type, each group showing its **total**:
  - **Cash** — Cash, Checking, and Savings accounts.
  - **Investments** — investment/brokerage accounts.
  - **Credit cards** — shown as a positive amount owed.
  - **Loans** — Loan accounts, shown as a positive amount owed, each linking to its loan in the Loans section. Loans are listed in both Accounts and Loans.
- The top of the page shows a **balance history chart** for the selected view, with time ranges **1M, 3M, 6M, YTD, 1Y, and ALL**.
- The chart views are **Net worth**, Cash, Investments, Credit cards, and Loans. **Net worth = Cash + Investments − Credit cards − Loans.**
- **Credit card terms:** credit cards (connected or manual) can store an optional **credit limit**, **interest rate (APR)**, and **card fee** (monthly or yearly amount). These are for reference and usage tracking; the app does not calculate interest or add fees to the balance.
- **Credit card payment and fee dates:** credit cards can store an optional statement closing day, payment due day, usual paying account, and the next fee date. Optionally (on by default when filled in) the app creates a monthly card-payment bill on the due day, whose amount is entered each month from the statement, and a recurring fee bill starting on the next fee date. These are ordinary bills, so calendar, summaries, reminders and matching follow the bill rules. Credit cards are edited in their own Edit credit card modal; other account types use Edit account details.
- **Credit limit history:** the limit is stored as dated entries (new limit, effective date, optional note, who recorded it and when). The current limit is the latest entry in effect. Changing the limit adds an entry rather than overwriting it; entries can be edited to correct mistakes, with change history kept. Usage for past dates uses the limit in effect on that day, and limit changes are marked on the card's chart. Whether the provider supplies limits (so sync could record changes automatically) still needs provider validation.
- **Loan repayment progress:** loans with a repayment total show percent repaid and amount paid of total on Accounts, per loan and for the Loans group. Balance-only loans show no percentage.
- **Adding accounts:** Add manual account is a menu of types. Cash, Checking, and Savings share one form; Credit card has its own form with card terms. Loans are added only from Loans.
- **Credit card usage:** Accounts shows each card's usage (balance owed ÷ limit) with a bar, and the Credit cards group shows overall usage against the total limit. The Credit cards chart view, and each card's own balance chart, can switch between **Amount owed** and **Usage %**.

Still open: investment valuation and history granularity, how far back history goes for recently added accounts, and whether selecting a chart view highlights its group. See [Open decisions](open-decisions.md#accounts-and-transactions).

### Credit-card calendar bill lifecycle

Monthly card-payment bills and recurring fee bills are approved as optional ordinary bills. The app does not execute payments, calculate interest, or add reference fees to balances. Relevant calendar switches default on when their necessary fields are filled. Completed occurrences and changed-field overrides retain the ordinary bill rules.

The following lifecycle specification remains incomplete and must be selected before implementation:

- A card-payment bill's amount is entered each month from the statement, while an ordinary bill requires an amount. Decide the representation and display of an occurrence before that amount is known, including summary, reminder, and matching behavior. Do not treat an unknown amount as an approved $0 amount or automatically use the current card balance/minimum payment.
- Define the required fields and preview when enabling payment/fee bills, and behavior when relevant fields are cleared. Select statement-close/payment-due mapping, including month transitions and same-day cases; existing last-day fallback rules still apply.
- Define how changing payment/fee dates, fee cadence/amount, or usual paying account affects linked bills, which fields/scopes change, and how directly edited occurrences and completed history are preserved.
- Define disabling/re-enabling a calendar switch, removing a card, and deleting/editing a generated bill independently. Avoid duplicate linked bills without inferring hard deletion, restoration, or automatic recreation.
- Define the initial effective date of an entered credit limit and correction of effective-dated entries, consistent with the approved limit-history model.

These questions are tracked in [Open decisions](open-decisions.md#accounts-and-transactions).

### Calculation coverage and missing data

The current net-worth formula and credit-card usage calculation are approved. Formatting and incomplete historical data require additional decisions; current sample values do not establish those policies.

| Calculation | Approved basis | Still to specify |
| --- | --- | --- |
| Current net worth | Cash + Investments − Credit cards − Loans | Credit/surplus balances, stale or unavailable provider balances, and display of incomplete aggregate data. |
| Card usage | Amount owed ÷ credit limit in effect on the date | Missing/zero limits, usage above 100%, rounding, credit balances, and historical dates without an effective limit. |
| Credit cards group usage | Overall usage against combined limits | Which balances/limits participate when only some limits are known; clearly distinguish unavailable coverage from a known zero. |
| Balance/net-worth history | Preserved account balance history; chart ranges/views approved | Provider history before setup, granularity, history start, missing samples, stale values, and treatment of account additions/removals in prior totals. |
| Loans group repayment progress | Paid amount against repayment totals; balance-only loans have no percentage | Mixed-group labeling/denominator so balance-only debt is not represented as a scheduled repayment total. |

Transaction import starting dates govern transaction eligibility, not automatically the start of balance history. No history backfill, carry-forward, interpolation, zero-fill, or investment valuation method is selected here.

## Accounts selected for scheduled records

Bills, subscriptions, loan payments, and scheduled income can reference **zero, one, or multiple household accounts** for planned payment or receipt of income. Selecting an account does not define a transaction attachment or execute a payment.

- Any account in the household can be selected, and its name is visible to all members.
- Deleting an account removes its account-selection relations. Existing transaction attachments follow the approved history rules.
- Member departure alone does not remove selections of household-owned accounts. The earlier account-selection removal-on-owner-departure rule is superseded.
- Recurring account-selection changes offer **This occurrence only** and **This occurrence and all future occurrences**.
- Future-scoped changes preserve earlier occurrences and already-paid/received occurrences. Incomplete future occurrences use the new selection, replacing their individual account-selection override.
- Match suggestions use **only selected accounts**. No selected accounts means **no suggestions**.
- Members may manually attach any household transaction they can access, regardless of selected accounts, including when no accounts are selected.
- Selecting accounts and marking ordinary bills/subscriptions paid or income received does not change account balances.
- Loan repayments are the exception: paid installments and extra payments reduce the associated **Loan account balance**; reversals/corrections recalculate it, retaining balance history.
- Scheduled status changes do not automatically debit selected paying accounts.
- Other balance updates come from provider imports, manual transaction creation with its update-balance option, or direct manual balance entry.

### Transaction matching suggestions

- Rank suggestions using **amount, date, and transaction payee similarity to the bill/income name**.
- The transaction amount must **match the occurrence amount exactly**. Do not suggest different amounts, including partial payments. This eligibility rule does not restrict manual attachments or change the occurrence's amount/status.
- Bill, subscription, and loan-payment suggestions use **outgoing transactions only**. Income suggestions use **incoming transactions only**.
- Among exact-amount matches, **closeness to the scheduled date takes priority over payee/name similarity**. Payee/name similarity remains a ranking factor; detailed similarity scoring and tie handling still require planning.
- Consider transactions dated within **seven days before through seven days after the occurrence's scheduled date**, including both boundary dates.
- Suggestions also remain available for **already-paid bills and already-received income**, under the existing eligibility rules.
- Show only the **top five** ranked suggestions, with no Show more and no pagination. Other eligible transactions can still be found and attached manually.
- Existing selected-account, hidden/deleted-transaction, pending/posted eligibility, and attachment-limit rules still apply. The suggestion date window does not restrict manual attachments.

Matching suggestions have **no dismiss option**. Household-wide, per-member, and temporary dismissal behavior are not features of the approved plan. This does not change the separate notification-dismissal rules. Detailed similarity scoring, tie handling, and provider/manual transaction sign normalization remain unselected; amount tolerances and different-amount/partial-payment suggestions are not approved. The outgoing/incoming suggestion restrictions do not restrict manual attachments.

## Connected accounts and transactions

- Transactions are imported through the provider.
- Pending bank transactions appear in Transactions with a **Pending** label when the provider supplies them.
- Both pending and posted transactions are eligible for manual attachments and matching suggestions. Posting status does not restrict eligibility; existing selected-account, hidden/deleted-transaction, and attachment-limit rules still apply.
- Imported **amount, date, and payee remain read-only**. All-member editing changes role permissions, not this previously approved source-field restriction.
- Sync automatically applies bank/provider corrections to imported amount, date, and payee, preserving previous values in change history. These fields remain read-only for household members.
- When a pending transaction becomes posted, it remains **one transaction in the app**, retaining its notes, category, hidden setting, and attachments. The transition must not create a duplicate. Provider identifiers and transition mapping still require validation and technical planning.
- All household members can edit transaction notes and category assignments. The earlier account-owner-or-household-owner category-editing restriction is superseded.
- Manual transaction entry is not allowed in connected accounts.
- Members can hide imported transactions, show hidden transactions, and unhide them.
- Hidden status is a household-wide display filter, not private access. Any current member can use Show hidden.
- Hidden transactions are excluded from new match suggestions.
- Hidden and soft-deleted transactions are excluded from monthly category budget spending. Existing history and attachment-retention rules still apply; see [Budget functionality](product-requirements.md#budget-functionality).
- All current household members can manually mark a transaction as an investment purchase or sale when the provider has not identified it, excluding it from Budget. Imported amount/date/payee remain read-only. Provider classification mapping, correction/removal of this designation, and precedence through later syncs remain open; see [Budget functionality](product-requirements.md#budget-functionality).

Pending display, attachment/suggestion eligibility, preservation through posting, automatic source-field corrections with change history, hourly automatic synchronization, reuse of a running sync for the same connection, no app-imposed Sync now cooldown, no automatic retries after temporary sync failures, and no in-app sync-failure notifications are approved. Connection details show the last successful sync time and latest error; partial syncs keep successful updates and identify failed accounts. Provider identifiers, pending-to-posted mapping mechanics, duplicate prevention, scheduling/concurrency mechanics, provider rate-limit handling remain open; sync status and errors are designed on Household and Connection details. Attachments, including pending transaction attachments, do not automatically change a scheduled occurrence's amount or paid/received status.

## Manual accounts

Manual accounts support finances without a provider connection.

- Types: **Cash, Checking, Savings, Credit Card, and Loan**. There is no Other type. Loan accounts are created only from the Loans page, not from Add manual account.
- Required fields: **name, type, current balance, and balance date**.
- Optional fields: **institution name and notes**.
- No visibility setting is offered; all household members can view/edit the account.
- Credit card and Loan balances display a **positive amount owed**, such as **$500 owed**.
- Loan accounts are listed in **both Loans and Accounts** (as the Accounts page's Loans group).
- Repayment scheduling is **optional** and configured **inside the loan**. A loan may track only its balance; there is no separate account-to-schedule linking flow.
- Configured loan installments appear on the household calendar.
- Loans, balances, schedules, past payments, unpaid installments, and attachments stay in their household when an associated member leaves. Shared loan-payment editing continues under the existing household permissions.
- Balance history is preserved.
- Manual transactions are permitted **only in manual accounts**.
- All household members can edit and delete manual transactions under the previously approved shared transaction workflow.

The earlier balance-only manual-account proposal was replaced by manual transactions. Loan repayments automatically update the household Loan account balance, with payment reversals/corrections recalculating it and retaining history. Transaction entry, credit-card credit/surplus presentation, and reconciliation with manual/provider loan balance updates still need planning.

### Transaction balance effects

- Creating a manual transaction offers **Update balance**, enabled by default.
- Editing a transaction does not automatically adjust its previous balance effect.
- Deleting a transaction does not reverse its previous balance effect.
- A separate manual balance update can correct the balance.
- Historical balance changes are preserved.

The design uses a Money out / Money in toggle with a positive amount (a proposal awaiting confirmation) and a separate Update balance form. Preventing double-counted loan repayments remains open.

### Manual account screens

Designed (see [UI design](ui-design.md#accounts-loans-and-investments)): a manual account detail page with Update balance and Add transaction and a list of transactions and balance updates with their balance effect; Add transaction (manual accounts only, Update balance on by default with a before → after preview); Edit transaction (explains that saving doesn't change the balance); Update balance (balance and date, kept in history, no transaction created); and Delete account. Loan accounts are edited in Loans, including the balance-only editor.

Imported amount/date/payee remain read-only, and connected accounts never allow manual transaction creation. Investment purchase/sale designation is a separate editable classification, not permission to edit imported source fields. Its correction/removal and sync precedence remain open.

### Deletion

All household members can delete financial records/accounts/connections. Deleted records retain history under the approved soft-deletion rules, with no restore feature. Soft-deleted manual transactions keep existing attachments. Deleting an account preserves its already-attached transactions and attachments for household history; account-selection relations are removed separately.

When a member deletes an imported transaction, it is **soft-deleted**. Later syncs that return the same transaction must not recreate or restore it. Its history is preserved. Transaction identity and persistent deletion handling still require technical planning.

When the bank/provider removes a transaction, the app also **soft-deletes** it, preserving its history and existing attachments. How the provider reports removals still requires validation; a transaction being absent from a limited sync response does not itself establish that the provider removed it.

Deleted transaction details are **not displayed through existing attachments**. The historical attachment remains stored. Showing the details with a Deleted label was rejected; the design shows a "Deleted transaction" placeholder with no details. This is separate from the Show hidden filter for non-deleted transactions.

## Attachments and privacy

- All current household members can view household transactions and attach/detach them through the shared workflow.
- One transaction can attach to **one non-deleted occurrence at a time**, while retaining historical links to soft-deleted occurrences.
- Soft-deleting an occurrence keeps its attachments and allows its transactions to attach to another non-deleted occurrence.
- Soft-deleting a manual or imported transaction keeps its existing attachments for history, but its details are not displayed through those attachments.
- One occurrence can have multiple attached transactions.
- Attachment totals never determine the occurrence amount or paid/received status.
- There are no private transactions or private attachment exceptions.
- Deleting an account retains already-attached transactions and attachments for history.
- Removing an attachment removes the link, not the household's transaction or other members' general transaction access.
- Member departure does not remove household records or attachments.

The heading is retained for existing document links; household membership is the access boundary.

### Hidden attached transactions

When an attached transaction is hidden:

- Keep its attachment.
- Hide its details from the bill/income display until Show hidden is used.
- Do not change the occurrence amount or status.
- Exclude it from new match suggestions.
- Exclude it from monthly category budget spending; its attachment does not determine the budget total or occurrence amount/status.

Show hidden is available to household members. Hidden status does not create member-exclusive visibility.

## Categories and investment scope

Categories are household-owned, with one level of subcategories, and apply to transactions, bills, income and subscriptions. All household members can manage the definitions and assign categories or subcategories to household records. Deleting a category moves its records to a chosen replacement. Assignments and definitions stay in their household; there is no category-list migration. Full rules: [Categories](product-requirements.md#categories).

Investments supports holdings and trading activity, subject to provider availability. The design proposes holdings (quantity, price, value, gain vs cost, cash) and buy/sell/dividend activity; valuation history, calculations, and how trading activity appears in Transactions remain open.

## Shared-record change history

Shared household records retain a change history showing **who changed the record, when, and the previous and new values**. This is additional to balance history and retained soft-deleted records. Actor history remains meaningful after a member leaves. Detailed presentation, event coverage, and audit storage/integrity remain technical and design planning topics; no audit schema or library is selected.

The design uses one shared Change history view for every record (actor, time in the viewer's timezone, field-level old → new values, bank/system changes labeled, former members named). Deleted transaction details are never shown in history. Event coverage and audit storage remain technical planning topics.

## Important unresolved data boundaries

- How should optional member associations be edited, reassigned, and preserved in history after departure?
- How should invalid/expired bank authorization and reauthorization behave? Continued sync after authorizing-member departure is approved while provider authorization remains valid. Household deletion stops synchronization and disconnects bank connections; the provider mechanics require validation.
- How should history, associations, and soft deletion be represented? No database schema is selected.
- How should provider-reported removals be detected and transaction identities tracked? Soft deletion with retained history/attachments and hidden deleted-transaction details are approved.
- How should manual/provider loan balance updates reconcile with repayment actions?

Household ownership, shared viewing/editing, and history retention are approved. Their unselected implementation details still require joint planning.

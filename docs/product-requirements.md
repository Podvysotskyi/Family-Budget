# Product requirements

## Purpose

Help household members organize scheduled bills, income, loan payments, and subscriptions; see upcoming obligations on a shared calendar; and jointly manage household-owned financial records.

The user's favorite part of Honeydue is adding household bills and seeing what is coming up each week. This calendar-centered experience is the primary product reference.

## Approved scope

- A web app usable on phones and desktops.
- Google-only authentication.
- Multiple independent households with separate member logins.
- Required household setup before using the app's features: after Google sign-in, a user without an active household must **create a household or accept an invitation to join one**. Normal app pages/actions are unavailable until setup is complete; invitation acceptance is available during onboarding.
- Organizational household members who do not have a login.
- All household financial records belong to the household and may also be associated with a member. Every current household member can view, create, edit, and delete household financial records, accounts, and connections. There are no public/private settings, and records do not move with members between households. Member creation/removal, invitations, ownership transfer, and household deletion remain owner-only; all members can edit member details.
- Household member nicknames used on assignments and preserved after departure/removal. The owner can transfer ownership immediately, without recipient approval, only to another current household member with a linked Google account. Members without linked accounts are ineligible.
- Shared scheduled bills and income.
- Actual payment/received dates, defaulting to today and editable by household members, separate from scheduled dates.
- An **Overdue** label for unpaid items past their due date, displayed on their original calendar date.
- Optional inclusive end dates for recurring bills and income; two separate twice-monthly occurrences remain separate even when both fall on the same last day of a short month.
- Optional household account selection for bills, subscriptions, loan payments, and income: no account, one account, or multiple accounts. Any household account is eligible and its name is visible to all members. Recurring edits support occurrence-only or future-occurrences scopes.
- Loans with installment schedules and extra payments.
- Subscriptions with scheduled payments and cancellation.
- Subscription deletion soft-deletes the subscription and all its occurrences, retaining history and transaction attachments with no restore. A preserved paid occurrence due on or after the cancellation effective date is soft-deleted if changed to unpaid.
- A month calendar with monthly and weekly summaries.
- Below the calendar, a list of the same items shown on the calendar, grouped by week and then by day.
- An Accounts page that groups accounts by type — **Cash** (Cash, Checking, and Savings accounts), **Investments**, **Credit cards**, and **Loans** — with a total for each group. Loans also keep their own Loans section.
- On Accounts, loans with a repayment total show repayment progress (percent repaid, amount paid of total) per loan and for the Loans group; balance-only loans show no percentage.
- Credit cards store an optional credit limit, APR, and monthly or yearly fee (reference only; no interest or fee calculation). Accounts shows credit card usage per card and for the group, and credit card charts can switch to a Usage % view.
- A balance history chart at the top of Accounts for the selected view — **Net worth**, Cash, Investments, Credit cards, or Loans — with **1M, 3M, 6M, YTD, 1Y, and ALL** time ranges.
- Budget functionality showing monthly spending from actual transactions dated within the month, grouped by category. Optional targets are monthly USD spending limits, showing spent, remaining, and amount over target. Repetition, edit/removal scopes, historical locks, override replacement, and core eligibility/calculation rules are approved below. Detailed classification and transaction-date handling remain open; the screens are designed (see [UI design](ui-design.md#budget-and-transactions)).
- Household-owned bank and investment connections through Lunch Flow's Platform API.
- Each connected account has its own inclusive import starting date. Moving it later keeps all already-imported transactions, including those before the new date. Moving it earlier automatically imports available older transactions on the next sync, including transactions dated on the selected starting date, without restoring deleted transactions.
- Initial account setup defaults to the first day of the current month in the setup member's profile timezone. Accounts discovered later in an existing connection import automatically from their UTC discovery calendar date, without waiting for starting-date confirmation.
- Hourly automatic synchronization retrieves the latest available Lunch Flow data; it does not guarantee hourly bank-data refreshes. A Sync now button is available to every household member immediately after an attempt finishes, without an app-imposed cooldown. Provider capabilities/quotas and rate-limit handling still require validation and planning.
- Additional requests for a connection already syncing reuse its running sync. Temporary sync failures do not trigger automatic retries; the regular hourly schedule and Sync now remain available under their approved rules.
- Sync failures do not send in-app notifications to household members. Connection details show the last successful sync time and latest error. The connection's last-success time updates only when all its accounts succeed in that sync; each account also has its own last-success time. Partial syncs retain successful updates and identify failed accounts. An account's displayed error clears after its next successful sync. The connection screens are designed; technical storage remains unselected.
- Household connections continue syncing after their authorizing member leaves, provided provider authorization remains valid.
- Soft-deleting a household stops synchronization and disconnects its bank connections, while preserving imported history.
- Household-owned manual accounts, balance history, and manual transactions.
- Manual account types: Cash, Checking, Savings, Credit Card, and Loan (no Other type; loans are created from the Loans page). Account entry requires name, type, current balance, and balance date, with optional institution name and notes. Credit cards and Loan accounts show a positive amount owed. Repayment schedules are optional and configured inside the loan, without a separate linking flow; a loan can track only its balance.
- Scheduled loan installments appear on the shared household calendar. All accounts and household records are visible to all household members.
- Paid loan installments and extra payments automatically reduce the Loan account balance; payment reversals/corrections recalculate it with balance history retained. Scheduled status changes do not automatically debit selected paying accounts.
- Transaction categories, hiding, and attachment to scheduled occurrences.
- Matching suggestions use amount, date, and payee similarity to the bill/income name. Amounts must match the occurrence exactly; different-amount and partial-payment suggestions are excluded. Bill, subscription, and loan-payment suggestions use outgoing transactions; income suggestions use incoming transactions. Date proximity ranks ahead of payee/name similarity among exact-amount matches. The suggestion window is seven days before through seven days after the scheduled date, including both boundary dates. Manual attachments remain independent of these suggestion restrictions. Matching suggestions have no dismiss option. Detailed similarity scoring, tie handling, and sign normalization remain unselected; suggestions are designed as the top five in the Manage and Mark paid modals.
- Matching suggestions remain available for paid bills and received income. Show only the top five ranked suggestions, with no Show more and no pagination; other transactions can still be found and attached manually.
- Pending bank transactions are displayed with a Pending label when supplied by the provider. Pending and posted transactions can both be attached or suggested as matches, subject to the existing account-selection, hiding/deletion, and attachment-limit rules.
- A pending transaction remains one app transaction when posted, preserving notes, category, hidden setting, and attachments. Sync automatically applies bank corrections to amount, date, and payee, preserving previous values in change history; members cannot edit these imported fields directly.
- User-deleted imported transactions are soft-deleted and remain deleted even when later syncs return them; no recreation or restoration.
- Provider-removed transactions are also soft-deleted, preserving history and attachments. Deleted transaction details are not displayed through existing attachments.
- Investment holdings and trading activity, subject to provider availability.
- Household-owned categories with one level of subcategories, and in-app notifications.
- Shared-record change history showing who made each change, when, and the previous/new values.
- USD only.

The app helps organize and track finances. Payment execution and investment trading execution were not requested or approved. Subscription cancellation records the end of payment tracking in the app; it does not cancel the subscription with the external service. Cancellation copy must make that distinction clear.

## Approved navigation

| Section | Purpose |
| --- | --- |
| Home | Calendar, monthly summary, a summary for each displayed week, and a week/day-grouped list of the calendar's items; clicking an item opens a Manage modal for that payment (status, payment date, transactions) |
| Bills & Income | List of bill and income series; create and edit in modals |
| Bills & Income › Subscriptions | Subscription records and recurring payment management |
| Accounts | Connected/manual accounts (including loans) grouped by type with group totals, balances, balance history, a net worth/balance history chart, and per-account sync status |
| Accounts › Loans | Loan accounts, totals, optional repayment schedules, installments, extra payments, and remaining balance |
| Accounts › Investments | Holdings and trading activity |
| Budget | Monthly spending by expense category and optional category targets |
| Budget › Transactions | Imported/manual transactions, categories, hidden records, and attachments |
| Household | Members, invitations, ownership, bank connection management, and household management |
| Household › Categories | The household's expense and income categories and their subcategories (see [Categories](#categories)) |
| Profile | Timezone, reminder time, and household invitations |

Navigation is approved. Subscriptions is a subsection of Bills & Income, Loans and Investments of Accounts, Transactions of Budget, and Categories of Household (user decisions, October 3, 2026); each keeps its own page. Notifications and Profile open from the top bar. Every section is designed; see [UI design](ui-design.md).

The earlier personal Accounts/Transactions/Investments experience without a household is superseded. Household setup is now a prerequisite for normal app navigation and actions, including Profile; users without an active household must create one or accept an invitation to join one through onboarding. Financial records remain in their household and departing users lose access. Household connections keep syncing after authorizing-member departure while provider authorization remains valid. The setup screens and the bank Reconnect flow are designed; technical enforcement and provider reauthorization mechanics still require planning.

In the Loans section, fully repaid loans are labeled **Paid off** and hidden by default, with a filter to show them. Extra payments are always paid and have a user-selected date; regular installments retain their individual paid/unpaid status.

Loan accounts are listed in Loans and also in the Accounts page's Loans group. Loans, balances, schedules, payments, and attachments remain in their household when an associated member leaves. Its calendar remains unchanged, including unpaid installments. Remaining household members continue viewing/editing those records; no financial record or repayment schedule automatically migrates to a new household.

## Categories

Categories are **owned by each household** and apply to its transactions, bills, income, subscriptions and Budget. This replaces the fixed app-wide list (October 3, 2026).

- **Starting list:** every new household starts with its own copy of the default list below. Later changes affect only that household. Categories stay with the household; no category list moves with a member who leaves or joins another household.
- **Who can manage them:** all current household members can create, rename, move, and delete categories and subcategories, consistent with all-member editing of household records.
- **Types:** each category is an **Expense** or **Income** category. The type is chosen at creation and cannot be changed later.
- **Subcategories:** a category can have subcategories, **one level deep**. A subcategory has its parent's type. Records can be assigned to a top-level category or to one of its subcategories. Names must be unique within the same parent.
- **Moving:** a subcategory can move to another parent of the same type, or become a top-level category. A top-level category with subcategories cannot itself become a subcategory.
- **Built-in categories:** **Transfers Between Accounts** (neither income nor expense) cannot be renamed, deleted, or given subcategories. **Loan Payments** (expense) cannot be renamed or deleted, but can have subcategories and a Budget target. Budget rules depend on both.
- No colors, icons, manual ordering or archive state: removal is by deletion only (user decision, October 3, 2026).
- **Renaming** updates the name everywhere, including past records and past Budget months.
- **Deleting** requires choosing a replacement of the same type (or Uncategorized). Deleting a top-level category also deletes its subcategories. All affected transactions, bills, income and subscriptions move to the replacement, in every month. Deletion is recorded in the shared change history and cannot be undone.
- **Budget:** spending in a subcategory rolls up into its top-level category. Targets are set on **top-level expense categories** only; **subcategories cannot have their own targets** (user decision, October 3, 2026). Deleting a category removes its target from the current and future months; locked past months keep their targets, shown under the former name marked as deleted, while their spending moves to the replacement under the existing rule that past spending totals keep updating.
- Uncategorized remains a reporting group, not a category, and still cannot have a target.

Assigning an existing category is separate from editing definitions. All household members can categorize all household records, including transactions, bills, and income. Assignments and hidden flags stay with household records when a member leaves. Hidden status remains a household-wide display filter with Show hidden, not private visibility.

Default list copied into each new household (households may change it):

| Type | Category | Default subcategories |
| --- | --- | --- |
| Expense | Housing | Rent; Mortgage; Repairs; HOA fees |
| Expense | Utilities | Electric; Gas; Water; Trash |
| Expense | Phone & Internet | Mobile; Internet |
| Expense | Insurance | Car; Home or renters; Health; Life |
| Expense | Transportation | Fuel; Public transit; Rideshare; Parking; Car maintenance |
| Expense | Groceries | Supermarket; Farmers market |
| Expense | Dining | Restaurants; Delivery; Coffee |
| Expense | Healthcare | Pharmacy; Doctor; Dental; Vision |
| Expense | Subscriptions | Streaming; Music; Software; Fitness |
| Expense (built-in) | Loan Payments | Car loan; Student loan; Personal loan |
| Expense | Other Expenses | — |
| Income | Salary | Regular pay; Bonus |
| Income | Freelance Income | — |
| Income | Benefits | — |
| Income | Interest & Dividends | Interest; Dividends |
| Income | Other Income | — |
| Transfer (built-in) | Transfers Between Accounts | — (subcategories not allowed) |

This supersedes the fixed app-wide category decision. Category deletion is a feature again, now with a required replacement category instead of leaving records uncategorized.

The default list includes the subcategories above (user decision, October 3, 2026); the exact names are a proposal and can be adjusted. No automatic categorization algorithm is selected. See [Categories decisions](open-decisions.md#categories).

## Notifications and personal settings

- Household invitations appear inside the app and in the recipient's Profile.
- A household may send multiple pending invitations to the same Google email; no cancellation of an existing invitation is required to send another.
- Accepting one invitation automatically cancels the other pending invitations from that same household to that email.
- Notifications support **read/unread status** and a **Mark all as read** action.
- Opening a notification automatically marks it as read.
- Users can dismiss notifications; dismissed notifications remain in notification history.
- Notification history is kept **indefinitely**, including dismissed notifications, without automatic deletion after a fixed retention period.
- Bill and loan reminders are in-app notifications only.
- Subscriptions use the same reminder rules as bills.
- Reminders are sent on the due date.
- Items already marked paid skip their due-date reminder.
- Creating a new unpaid item due today after a recipient's reminder time does not send that recipient an immediate reminder.
- Changes to an occurrence's due date or reminder settings can trigger another reminder at the updated scheduled date/time, even if a reminder for that occurrence was already sent to that member.
- For existing unpaid items due today, adding a recipient or changing the reminder schedule after its relevant scheduled time has passed sends an immediate catch-up reminder to that recipient.
- Moving an existing item's due date to yesterday or an earlier day does not trigger an immediate reminder.
- For daylight saving changes, skipped reminder times run at the next valid local time. Repeated times send once, at their first occurrence.
- Each bill or loan can have selected member recipients; subscription reminders follow this rule.
- Reminder recipients are independent of the member assignment used to organize a bill.
- Each user selects a timezone and reminder time in Profile.
- The default timezone is browser-detected and can be changed.
- The default reminder time is **9 AM** in the user's timezone.
- Scheduled income reminders were not approved.

Notifications are designed (see [UI design](ui-design.md#notifications-and-profile)); destinations for deleted or inaccessible records and delivery duplicate prevention remain [open](open-decisions.md#behavior-to-specify-before-building). Read/unread status, Mark all as read, automatic marking on open, dismissal with preserved history, and indefinite notification-history retention are approved.

## Budget functionality

The user approved a **monthly spending view grouped by category** and the ability to **set optional targets for expense categories**. Category targets are distinct from managing the household's category definitions (see [Categories](#categories)). Targets are set on top-level expense categories; subcategory spending rolls up into them. Household ownership and shared editing permissions continue to apply to household financial configuration.

Monthly category spending is calculated from **actual transactions dated within that month**. Scheduled bills/payments do not add a separate amount to this transaction-based budget total. Targets are **monthly USD spending limits**, and each category displays **spent, remaining, and amount over target**.

- **Transfers between household accounts are excluded** from budget spending. Transfer identification and classification details still require planning.
- **Transactions categorized as Transfers Between Accounts are excluded**, even if the matching transaction has not been imported. This exclusion does not require an imported counterpart.
- **Credit-card repayments are treated as transfers for Budget and excluded**, so counting eligible purchases does not also count paying the card. Repayment identification details remain unselected.
- Eligible outgoing transactions categorized as **Loan Payments count their full amount**, including principal, interest, and fees, unless classified as transfers. Budget does not split these transactions into principal and interest/fee components. Scheduled loan installments and extra-payment records do not add separate spending beyond eligible transactions.
- **Both pending and posted transactions count** toward budget spending, subject to the other eligibility rules. A pending transaction becoming posted remains one app transaction under the approved sync rules; it must not add a duplicate amount to the budget.
- **Hidden transactions are excluded** from budget spending.
- **Soft-deleted transactions are excluded** from budget spending, while their history and historical attachments remain preserved under the existing rules.
- **Transactions assigned to income categories are excluded** from budget spending.
- **Investment purchases and sales are excluded** from budget spending. Any current household member can manually mark a transaction as an investment purchase or sale when the provider has not identified it, so Budget excludes it. Provider classification mapping, correction/removal of the designation, and precedence through later syncs remain open.
- **Separately recorded investment fees count as spending when assigned to an expense category**, subject to the existing eligibility rules. This does not add a component-splitting feature for fees embedded in a purchase/sale transaction.
- An eligible **incoming transaction assigned to an expense category automatically reduces that category's spending**, like a refund. The existing hidden, deleted, and transfer exclusions continue to apply; this calculation does not require a separate refund designation.
- Eligible **refunds reduce spending in their assigned category**, in the month of the refund transaction. The refund is grouped by its own transaction date, not the original purchase date.
- If eligible refunds exceed a category's expenses that month, **Spent displays a negative amount**. Spending is not clamped to zero in that case.
- Eligible **uncategorized expenses appear in an Uncategorized group** and count toward total spending. This is a reporting group, not a new user-editable category definition, and **cannot have a target**.
- **Uncategorized incoming transactions are excluded** from budget spending; they do not reduce the Uncategorized total.
- Category targets are **optional**. Categories without a target still show their spending with a **No target** label; optional target settings do not remove spending from the report. Their **Remaining** and **Over target** fields display a dash (`—`).
- **Only expense categories can have targets**. Income categories and Transfers Between Accounts cannot have targets; Uncategorized remains a reporting group without a target.
- Target amounts must be **nonnegative USD amounts**: **$0 is allowed**, and negative amounts are rejected. A configured $0 target is distinct from having no target.
- Category targets **automatically repeat each month until changed**.
- **Unused budget does not carry over** into the next month. Unused amounts from a prior month do not increase the next month's target.
- Editing a category target offers **This month only** and **This month and all future months**. The first changes the selected month's target; the second changes the selected month and future months. Earlier months are outside the future-edit scope.
- **Past-month targets cannot be edited** by household members, including the owner. The lock uses **UTC calendar-month boundaries**, giving all members the same cutoff: at 00:00 UTC on the first day of a new month, the previous month's targets are past-month targets.
- The past-month lock also **prevents adding or removing targets**, for all household members including the owner.
- Removing a target offers **This month only** and **This month and all future months**. Month-only removal clears the selected month's target and leaves other months unchanged; future-scoped removal clears targets in the selected month and future months, leaving earlier months unchanged. Existing history-retention rules apply.
- **This month and all future months replaces existing individual target overrides** in the selected month and future months. Previous values remain covered by the approved shared-record change history; history storage remains unselected.
- **Past-month spending totals continue to update** when their transactions are imported, corrected, recategorized, hidden, or deleted. Existing spending eligibility rules apply to the updated records. Locked historical targets remain unchanged; locking targets does not freeze spending totals.
- **Overspending leaves the next month's target unchanged**. It does not reduce the next month's target; unused budget and overspending are not carried forward.
- **Remaining = monthly target minus Spent**, without clamping. A $100 target with $120 Spent shows **−$20 Remaining**; a $100 target with −$20 Spent shows **$120 Remaining**.
- Overspending retains the approved **Over target** labeling/indicator. Remaining remains a signed amount. The design shows over-target rows with an orange "Over by" badge and bar.

Budget has its own navigation section and opens to the current UTC calendar month. Members can browse previous and future months. Clicking a category shows the transactions contributing to its spending for the selected month, under the approved spending eligibility rules. The month view, category table and target modals are designed; see [UI design](ui-design.md#budget-and-transactions).

An expense category appears in the selected month's Budget view only if it has a target or contributing transactions that month. Contributing transactions keep the category visible even when expenses and refunds net to $0. Categories with neither a target nor contributing transactions are omitted. An **Add target** action lets members select any expense category, including one absent from the view; past-month target locks still apply.

Spending that exceeds a current-month category target triggers an in-app notification to all current household members. Alerts use UTC calendar months, matching target-locking rules. Any change that puts spending over target can trigger the alert, including transaction imports, manual transactions, recategorization, and lowering the target, provided the category has not already alerted that month. Each category sends only one alert per month, even if spending falls below its target and exceeds it again during that month. **Targets are informational**: totals and alerts do not block transaction entry or other actions when exceeded, and do not initiate automatic financial actions.

This expands the earlier scope: monthly category spending and monthly USD category targets are approved features. The calendar summaries keep their scheduled-record calculations.

Still open: transaction-date handling, transfer and credit-card repayment identification, and correcting investment designations. See [Open decisions](open-decisions.md#budget).

## Financial summaries

The approved planning summaries use scheduled records rather than actual transaction-based spending reports:

- **Income:** planned/expected scheduled income.
- **Total due:** scheduled bill amounts due in the period, including loan installments and subscription payments.
- **Total paid:** amounts of paid bill occurrences due in the period.
- **Total unpaid:** amounts of unpaid bill occurrences due in the period.

Calendar filtering does not change summary totals. Actual payment and received dates do not change the scheduled/due-date grouping. See [Schedules and calendar](schedules-and-calendar.md#summaries) for period rules.

## Features not yet approved

The following must not be inferred from the budgeting label, the Honeydue reference, or the selected stack:

- Expense splitting, reimbursements, or balances owed between household members.
- Household chat.
- Savings goals.
- Reports beyond the approved monthly category-spending view and the Accounts net worth/balance history chart, including investment performance calculations.
- Multiple currencies or currency conversion.
- Native mobile apps.
- Email, SMS, or push reminders.
- Payment initiation or investment order placement.
- File imports into connected accounts, including a specific Apple Card workaround.

These are not a permanent rejection of future features. They are outside the currently approved requirements.

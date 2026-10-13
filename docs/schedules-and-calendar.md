# Schedules and calendar

## Common scheduling rules

Bills and scheduled income support:

| Frequency | Approved meaning |
| --- | --- |
| One time | A single scheduled occurrence |
| Weekly | Every week |
| Every two weeks | Every two weeks |
| Monthly | Each month on the scheduled date |
| Twice a month | On two chosen dates each month |
| Yearly | Each year on the scheduled date |

- A scheduled day missing from a month falls on the **last day of that month**.
- If both chosen twice-monthly dates fall back to the same last day, keep **two separate occurrences** on that day; do not merge them. Each retains its own amount, status, and attachments.
- Weekend dates remain on their scheduled date.
- Scheduled dates are the **same calendar date for every household member**.
- An individual occurrence has its own amount and completion status.
- Editing or deleting a recurring bill or income offers **This occurrence only** or **This occurrence and all future occurrences**.
- Earlier occurrences remain unchanged when changing future occurrences.
- A future-series edit leaves already **paid bill occurrences** and **received income occurrences** unchanged, including those with future scheduled dates.
- For unpaid bills or unreceived income in the edited future range, replace individual overrides **only for fields changed by the series edit**. Unrelated fields are not reset by that edit.
- Recurring bills and scheduled income can have an **optional end date**. The date is inclusive: an occurrence due on the end date is included, and later occurrences are not newly scheduled. Changing an existing end date still preserves completed occurrences under the rule above.

Examples of the approved date rule: a monthly bill scheduled for the 31st is due on February's last day; a bill due on a Sunday stays on Sunday.

Example: twice-monthly dates of the 30th and 31st produce two distinct occurrences on February's last day.

Example: a future unpaid bill individually changed to $105 is updated to $110 if the series edit changes its amount to $110. An occurrence already marked paid keeps its existing amount and date. If the series edit changes only the date, it does not reset an individual amount override.

Form fields are designed (see [UI design](ui-design.md#bills--income-and-subscriptions)); how an edit from the series list chooses its anchoring occurrence is still open (see [Open decisions](open-decisions.md#behavior-to-specify-before-building)).

The forms include twice-monthly controls (two day-of-month pickers, each date its own payment) and an upcoming-dates preview. Income has its own Manage modal with received-date correction. See [UI design](ui-design.md#bills--income-and-subscriptions).

## Payment and receiving account selection

Bills, subscriptions, loan payments, and scheduled income allow selecting the financial accounts intended for payment or receipt of income.

- Selection is optional: **no account, one account, or multiple accounts** are supported.
- Members can select **any account in their household**. There are no private accounts; selected account names are visible to all members.
- Deleting an account removes its selection relations from bills, subscriptions, loan payments, and income. Member departure alone does not remove household account selections. Transaction attachments follow their separate history rules.
- Bills, subscriptions, and loan payments use the selection to identify intended payment accounts; income uses it to identify intended receiving accounts.
- This account selection is an additional requirement alongside existing transaction attachments and member assignments.
- Changes to selected accounts on recurring records offer **This occurrence only** and **This occurrence and all future occurrences**. Earlier occurrences remain unchanged when changing future selections.
- Future-scoped account-selection edits follow the completion rule above: already-paid bills/payments and received income remain unchanged; incomplete future occurrences use the newly selected accounts.
- Transaction match suggestions use **only selected accounts**. If no accounts are selected, no match suggestions are shown.
- Manual transaction attachments can use **any transaction the member can access**, regardless of selected accounts, including when no accounts are selected.
- Selecting accounts, marking ordinary bills/subscriptions paid, or marking income received **does not change financial account balances**. Other balance updates come from provider imports, manual transaction creation with its balance option, or direct manual balance entry by household members.
- Loan repayments are an exception: paid installments and extra payments automatically reduce the **Loan account balance**, and reversals/corrections recalculate it. Preserve balance history. This does not automatically debit the selected paying accounts.

The core account-selection rules above are approved. Suggestions use amount, date, and payee similarity to the bill/income name, within the inclusive window from seven days before through seven days after the occurrence's scheduled date. Amounts must match the occurrence exactly; different-amount/partial-payment suggestions are excluded. Bill/subscription/loan-payment suggestions use outgoing transactions; income suggestions use incoming transactions. Date proximity has priority over payee/name similarity among exact-amount matches. Matching suggestions have no dismiss option and remain available for paid bills/received income. Show only the top five ranked suggestions, with no Show more and no pagination; other transactions can still be found and attached manually. Detailed similarity scoring, tie handling, and sign normalization remain open; see [Open decisions](open-decisions.md#matching).

## Bills

- Household members can create, view, edit, and delete bills.
- Bills can be assigned to one member or the entire household for organization.
- Each bill has one shared amount, without member splits.
- A bill can have zero, one, or multiple selected payment accounts.
- Each occurrence is independently **paid** or **unpaid**.
- Record the actual payment date separately from the due date when an occurrence is marked paid. Default it to today and allow household members to change it.
- Unpaid items past their due date display an **Overdue** label and remain on their original calendar date. Loan installments and subscription payments follow this bill rule.
- Bills may have multiple attached transactions.
- Members can update status manually and confirm suggested transaction matches.
- Confirming or attaching a transaction does **not** change the bill's amount or status.
- Bill reminders use selected recipients and the due-date rules below.

Bill and income forms require name, amount, how it repeats, and the first date; category, end date, assignee, accounts, and reminder recipients are optional (see [UI design](ui-design.md#bills--income-and-subscriptions)). Variable bill amount behavior beyond per-occurrence amount changes still needs approval. Actual payment dates and the Overdue label are approved; detailed visual styling remains part of design planning.

## Scheduled income

- All household members can create, view, edit, and delete scheduled income.
- Income is scheduled and shown on the calendar.
- Scheduled income can have zero, one, or multiple selected receiving accounts.
- Each occurrence is independently **received** or **not received**.
- Record the actual received date separately from the scheduled date when an occurrence is marked received. Default it to today and allow household members to change it.
- A member can change the amount of one specific income occurrence.
- Multiple transactions can attach to one income occurrence.
- The member explicitly decides whether the income is complete and what its amount is.
- Attached transactions do **not** determine the amount or received status.
- All scheduled income appears on the calendar, whether received or not received.

Income reminders were not approved.

## Matching and transaction attachments

- The app suggests transaction matches; a member confirms them.
- Suggestions consider transactions only from the occurrence's selected accounts. With no selected accounts, there are **no suggestions**, rather than a fallback to all accessible accounts.
- Members may manually attach any accessible household transaction, including from an account that is not selected or when no account is selected. Current household membership/access rules apply, along with the non-deleted-occurrence attachment limit below; there is no private-account exception.
- Attachment and completion status are separate actions.
- A transaction can attach to only **one non-deleted occurrence at a time**. It can also retain historical attachments to soft-deleted occurrences.
- Soft-deleting an occurrence keeps its existing transaction attachments. Those transactions can then attach to another non-deleted occurrence without removing the historical links.
- Soft-deleting a manual transaction also preserves its existing attachments for history.
- One occurrence can have multiple transactions.
- Attached transaction totals need not equal the occurrence amount.
- Hidden transactions are excluded from new suggestions.
- Hiding an already attached transaction keeps its attachment but hides its details until hidden transactions are shown.

Matching factors, exact-amount eligibility, outgoing transactions for bill/subscription/loan-payment suggestions, incoming transactions for income suggestions, date priority over payee/name similarity, and the inclusive seven-day window before/after the scheduled date are approved. Different-amount/partial-payment suggestions were rejected, and matching suggestions have no dismiss option. Detailed similarity scoring, tie handling, sign normalization, and the exact relationship between imported trading activity and matchable transactions remain undecided. The selected-account restriction and suggestion amount/date/direction rules apply to suggestions only; manual attachments use any accessible transaction.

## Loans

A loan records:

- The total repayment amount.
- The regular installment amount.
- The payment schedule.

The entered total is the full amount to repay, including interest and fees. The app does not calculate interest or APR.

- Users can add an existing loan and record payments already made.
- Alternatively, an existing loan can start from **only its current remaining balance**, without requiring original repayment totals or past payment history. That amount is the opening repayment balance for the loan tracked in the app.
- After payments exist, household members can change the repayment total, regular installment amount, or payment schedule while preserving paid history.
- Repayment-term changes affect **all unpaid installments**, including overdue installments. Paid history remains unchanged.
- The all-unpaid scope applies to **repayment terms**, not indiscriminately to every field in a combined loan editor. Selected payment-account changes retain **This occurrence only** / **This occurrence and all future occurrences**, with completed occurrences preserved. Provide a distinct scope control or editing path so these rules are not conflated.
- The repayment total **cannot be reduced below the amount already paid**. The app rejects such a change; the minimum allowed total equals the amount already paid.
- Loan installments appear on the calendar as bill payments.
- Repayment schedule configuration is **optional** and belongs **inside the loan**, without a separate account-to-schedule linking flow. A Loan account may track only its balance and displays a positive amount owed. When a schedule is configured, its installments appear on the household calendar. Loans are household-owned and visible/editable by all household members, like other records.
- Loan accounts appear in **both the Loans section and the Accounts page's Loans group**, and are included in net worth. The earlier only-in-Loans rule is superseded.
- A member changing households does **not change the original household's loan calendar**. Loans, balances, schedules, existing occurrences, past payments, and attached transactions stay in that household and remain visible/editable by its members. No loan or schedule automatically moves to the member's new household. Normal paid-item filtering still applies.
- Paid installments and extra payments automatically reduce the Loan account balance. Reversing a regular installment to unpaid or correcting/deleting a payment recalculates that balance under the approved repayment rules, preserving balance history. Handling overlapping manual/provider balance updates still requires planning.
- Loan payments support zero, one, or multiple selected household payment accounts. Recurring account-selection changes use the occurrence-only or future-occurrences scopes above.
- Each installment has its own paid/unpaid status.
- An installment that becomes overdue keeps its original due date; later installments continue on schedule. Becoming overdue does not automatically shift payment dates.
- Loan installments count toward bill summaries.
- Scheduling stops when the repayment total is covered.
- A final installment can be smaller than the regular installment.
- Extra payments are supported.
- An extra payment is always recorded as **paid**, and the member chooses its date. It is not a scheduled unpaid installment.
- Members can correct an extra payment by editing its amount or date, or soft-deleting it. Preserve its original history and recalculate the remaining balance and unpaid installments after the correction.
- The app prevents an extra payment from exceeding the loan's remaining balance.
- Extra payments reduce the number of remaining installments while keeping the regular installment amount.
- Remaining balance is the entered total minus payments marked paid, including paid extra payments.
- Marking a paid regular installment unpaid restores that amount to the remaining balance. Extra payments remain paid unless soft-deleted; corrections use amount/date edits or soft deletion rather than an unpaid status.
- Fully repaid loans are labeled **Paid off** in the Loans section.
- Paid-off loans are hidden from the loan list by default, with a filter to show them. Their records are preserved rather than deleted upon repayment.

Approved examples:

- A $1,250 loan with $500 installments produces $500, $500, and $250 payments.
- A paid extra payment lowers the remaining repayment amount and can shorten the remaining schedule; it does not lower the regular installment amount.

Existing loan entry supports past payment history or a remaining-balance-only start. Exact entry fields and schedule recalculation mechanics around preserved paid installments still need planning. Future-series edits preserve completed occurrences and replace incomplete future overrides only for changed fields. Repayment-term changes affect all unpaid installments, while becoming overdue alone leaves the payment schedule unchanged. Extra payments cannot exceed the remaining balance.

Example: if $1,000 has already been paid, changing the repayment total to $900 is rejected. A total of $1,000 meets the minimum and leaves a $0 remaining balance.

## Subscriptions

- Subscriptions have their own navigation section.
- Payments appear on the calendar.
- A subscription can have zero, one, or multiple selected payment accounts.
- They follow recurring bill rules, including per-occurrence paid/unpaid status, transaction attachments, summaries, and reminders.
- The supported states are **Active** and **Canceled**.
- There is no Paused state.
- A member chooses a **cancellation effective date**.
- The subscription remains **Active** before that date and becomes **Canceled** on that date.
- Scheduling cancellation is final: members cannot change the effective date or withdraw the cancellation, even before it takes effect.
- Cancellation stops future scheduled payments and reminders while preserving history.
- The cutoff includes the effective date: unpaid payments due **on or after** it stop.
- Occurrences already marked paid on or after that date remain in the calendar and history. The normal show-paid calendar filter still applies.
- If a preserved paid occurrence due on or after the cancellation effective date is changed to unpaid, soft-delete that occurrence. Keep its history and transaction attachments under the approved occurrence-deletion rules.
- Canceled subscriptions cannot be reactivated; restarting requires a new subscription.
- Deleting a subscription soft-deletes the subscription and **all its occurrences**, including paid occurrences. Preserve history and transaction attachments; no restore is available.

Cancellation records the end of payment tracking in this app. It does not cancel a contract or request cancellation from the external service. The cancellation modal tells the member to cancel with that service separately, and Delete subscription is a separate action with its own confirmation.

The Subscriptions page also shows paid-this-year, paid-since-start, a payments-by-month chart, and an aggregate "a month" amount. Their date basis and conversion for nonmonthly frequencies, price changes, and cancellations still require specification and must not change the calendar or Budget calculations (see [Open decisions](open-decisions.md#accounts-and-transactions)).

Example: cancellation effective October 15 stops unpaid payments due October 15 or later. An October 20 occurrence already marked paid is preserved in the calendar and history.

Example: changing the preserved October 20 payment to unpaid soft-deletes that occurrence because it is due after the October 15 cancellation cutoff. Its historical transaction attachments remain, and the transactions can attach to another non-deleted occurrence under the existing attachment rules.

## Calendar

- Home contains the calendar and financial summaries.
- The calendar has **month view only**.
- Users can navigate between months.
- Weeks begin on **Monday**.
- The calendar contains scheduled bills, scheduled income, loan installments, and subscription payments.
- Standalone account transactions do not become calendar entries simply because they were imported or entered manually.
- Bills default to **unpaid only**, with an option to show paid bills.
- Loan and subscription payments follow bill display rules.
- All scheduled income appears, regardless of received status.
- Below the calendar, the same items shown on the calendar also appear as a **list grouped by week and then by day**. The list follows the calendar's display filters, such as Show paid bills.

Clicking a calendar item opens the Manage modal for that payment, where members mark it paid or received, set the payment date, and attach, detach, or search for transactions. Event styling, the Manage modal and busy-day overflow ("+N more") are designed; see [UI design](ui-design.md#home). Calendar member filters are not designed.

## Summaries

### Periods

- The monthly summary covers the **month currently displayed**.
- A separate weekly summary appears for **every week displayed in that month calendar**.
- Each weekly summary covers **all seven days**, including dates outside the displayed month.
- Weeks run Monday through Sunday.
- Summaries include relevant scheduled items regardless of whether paid items are currently hidden on the calendar.

For example, a displayed week crossing from September into October includes the entire week's scheduled items in its weekly summary. The September monthly summary includes only September items.

### Metrics and date basis

| Metric | Approved basis |
| --- | --- |
| Income | Planned/expected amount of scheduled income in the period |
| Total due | Scheduled bill amounts due in the period, including loan and subscription payments |
| Total paid | Paid scheduled bill amounts with due dates in the period |
| Total unpaid | Unpaid scheduled bill amounts with due dates in the period |

- Spending in these summaries means **scheduled bills only**.
- Imported or manual transactions do not independently add spending to these totals.
- Paid bills are grouped by their **due date**, not the date they were paid.
- Recording or changing an actual payment or received date does not change the summary period. Scheduled/due dates remain the basis for these summaries.
- Expected income includes all scheduled income, rather than only received income.

Example: rent due October 1 and marked paid September 29 belongs in October's total due and total paid.

No additional actual-spending, available-balance, or overdue-carry-forward metric is selected for these calendar summaries. The subsequently approved monthly category-spending view and category targets are documented in [Budget functionality](product-requirements.md#budget-functionality); their core calculations and target lifecycle are approved, with remaining classification/date-handling and implementation details open. They do not change the existing calendar-summary rules.

## Reminders and time

- Bills, loan payments, and subscriptions support reminders.
- Reminder delivery is **in-app only**, on the due date.
- In-app notifications support **read/unread status** and **Mark all as read**.
- Opening a notification automatically marks it read; users can dismiss it while keeping it in notification history.
- Notification history, including dismissed notifications, is retained **indefinitely** rather than automatically deleted after a retention period.
- Recipients are selected members for each bill/loan; subscriptions follow the same rules.
- Each recipient uses their own Profile timezone and reminder time.
- Default reminder time is 9 AM.
- If an occurrence is already marked paid at the recipient's reminder time, skip its due-date reminder.
- If an unpaid occurrence due today is created after a selected recipient's reminder time, do not send that recipient an immediate catch-up reminder.
- A change to an occurrence's due date or reminder settings can produce **another reminder at the updated scheduled date/time**, even if that member already received a reminder for the same occurrence. Paid-item suppression still applies.
- For an **existing unpaid item due today**, adding a recipient or changing its reminder schedule after the relevant scheduled time has passed triggers an **immediate catch-up reminder** for the affected recipient. The no-catch-up rule for newly created items does not extend to those changes.
- Changing an existing item's due date to **yesterday or an earlier calendar day** does **not** trigger an immediate reminder.
- If a daylight saving clock change skips the chosen local reminder time, send at the **next valid local time**. For example, if the clock jumps from 2 AM to 3 AM, a 2:30 AM reminder runs at 3 AM.
- If a clock change makes the chosen local time occur twice, send that scheduled reminder **only once, at the first occurrence** of the time.
- Database timestamps use UTC.
- Scheduled calendar dates keep the same date for everyone; they must not shift when viewed in another timezone.

This distinction records the approved behavior. It does not select a database schema or a specific scheduling library.

The business reminder rules above, including daylight saving behavior, are approved. Delivery duplicate prevention still needs a technical plan; it must distinguish a duplicate delivery from a newly scheduled reminder after an approved date/settings change.

Example: an installment due September 5 and marked paid September 4 does not generate a September 5 due-date reminder if it is still paid at delivery time. Reminder notifications keep the original due date in their headline and show the current status as a badge.

## Deletion and history

Bills, scheduled income, and loans use soft deletion and retain historical records. Scheduled occurrences are soft-deleted, with their transaction attachments preserved. A retained attachment to a soft-deleted occurrence does not prevent the transaction from attaching to another non-deleted occurrence. Soft-deleted manual transactions retain their existing attachments for history. Household membership/access rules apply to retained links; there are no private records, and no restore feature was approved. Subscription deletion soft-deletes the subscription and all occurrences, including paid occurrences, retaining history and attachments. Cancellation instead stops unpaid occurrences due on or after its effective date and preserves paid occurrences; changing a preserved paid occurrence at or after the cutoff to unpaid soft-deletes it. These behaviors are approved, and their confirmations and the deleted-transaction placeholder are designed.

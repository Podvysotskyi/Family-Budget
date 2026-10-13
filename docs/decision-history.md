# Decision history

This document records important changes in direction. It is a topic-based summary, not a transcript or a claim that approval dates were recorded individually.

## Design completed and docs cleaned up

On October 3, 2026 the design was completed for every approved section: the review corrections were applied, missing screens were added (bank connections, manual accounts, loan and income variants, destructive confirmations, member view, change history, Investments proposal), plus first run, empty states and busy calendar days. All 81 screens were re-exported to docs/design. The user then asked to bring all docs up to date with the design: [UI design](ui-design.md) was rewritten as a description of the current screens, [Open decisions](open-decisions.md) was reduced to the questions still open, and requirement docs now point to the designed screens instead of listing missing layouts. Design choices beyond the approved rules are listed as proposals awaiting confirmation.

## Phone layouts out of scope for now

On October 3, 2026 the user added phone layouts to the design and then asked to ignore them completely for now. The Phone page was removed from the canvas and phone-layout references were removed from the design docs. Design work is desktop only. The product requirement that the web app is usable on phones and desktops is unchanged.

## Navigation: nested sections

On October 3, 2026 the user made Loans and Investments subsections of Accounts, Transactions a subsection of Budget, Subscriptions a subsection of Bills & Income, and Categories a subsection of Household. Each keeps its own page; the sidebar and phone menu show them indented under their parent. The phone tab bar still has direct Transactions and Budget tabs.

## Frontend component approach

On October 3, 2026 the user chose how to build the UI component library ([Component library](component-library.md)): build our own components instead of using a headless UI library, a searchable category picker, an in-house date picker, Chart.js for charts, and Storybook as the component catalog. Follow-up the same day: Chart.js is used through the **vue-chartjs** wrapper, and **Storybook is dropped**; no component catalog tool is used.

## Household-owned categories

On October 3, 2026 the user made categories **household-owned** with a page to manage them, and allowed **subcategories**. This supersedes the fixed app-wide category list. Each household starts from the previous default list. Claude, asked to decide details, set these working rules: all members manage categories; one level of subcategories with the parent's type; type fixed after creation; built-in Transfers Between Accounts cannot be changed; deletion requires a replacement of the same type (or Uncategorized) and moves records in every month; Budget targets stay on top-level expense categories and subcategory spending rolls up. Follow-up answers the same day: the default list includes subcategories; Loan Payments becomes built-in (no rename or delete, subcategories allowed); no colors, icons, manual ordering or archive state. The user briefly allowed subcategory Budget targets, then reversed it: **subcategories cannot have their own targets**. Remaining questions are in [Open decisions](open-decisions.md#categories).

## Required household setup

The user now requires household setup before using the app's features because financial records attach to a household. They clarified that **accepting an invitation also satisfies the requirement**: after Google sign-in, users without an active household must create one or accept an invitation to join one before accessing normal app pages/actions, including Profile. Invitees do not need to create a temporary household first. This replaces the earlier assumption of normal Profile access without household membership. Users who leave, are removed, or lose their household through deletion return to required setup without access to the former household's records. Existing one-active-household and ownership rules still apply.

## Budget scope expansion

The user added budget functionality: see monthly spending grouped by category and set targets for each category. This replaces the earlier exclusion of category budget targets and monthly category-spending reports from approved scope. Monthly spending uses actual transactions dated within that month. Targets are monthly USD spending limits, with spent, remaining, and amount over target displayed for each category. Remaining transaction inclusion, alert details, layout, and navigation behavior still require planning; savings goals and broader financial reports were not approved by this request.

Transfers between household accounts are excluded from budget spending. The user selected option A: both pending and posted transactions count toward spending. Pending-to-posted transitions must not duplicate the same transaction's budget contribution. Remaining inclusion and transfer-classification details require planning.

The user also excluded hidden transactions and soft-deleted transactions from budget spending. This preserves the existing history/attachment-retention rules and does not change scheduled occurrence amounts or statuses.

Refunds reduce spending in their assigned category during the month of the refund transaction. Spent displays a negative amount when eligible refunds exceed that category's expenses in the month. Uncategorized expenses appear in an Uncategorized reporting group and count toward total spending; the group cannot have a target. Category targets are optional: untargeted categories still show spending with a No target label. The user subsequently approved excluding income-category transactions and automatically treating eligible incoming expense-category transactions as reductions of that category's spending, like refunds, without a separate refund designation for the calculation. Existing hidden, deleted, and transfer exclusions still apply.

Uncategorized incoming transactions are excluded from budget spending and do not reduce the Uncategorized total. Transactions categorized as Transfers Between Accounts are excluded even if the matching transaction has not been imported; an imported counterpart is not required for this exclusion. Remaining transfer detection/classification details still require planning.

The user approved counting the full outgoing amount of eligible transactions categorized as Loan Payments, including principal, interest, and fees, unless classified as transfers. Budget does not split those components. Credit-card repayments are treated as transfers for Budget and excluded, so eligible purchases and paying the card are not counted twice. These rules apply to actual transactions; scheduled loan payment records do not add separate spending. Repayment identification and balance reconciliation remain unselected.

Investment purchases and sales are excluded from budget spending. The user also approved counting separately recorded investment fees assigned to expense categories as spending, subject to other eligibility rules. Any current household member can manually mark a transaction as an investment purchase or sale when the provider has not identified it, excluding it from Budget. This does not approve embedded-fee component splitting. Provider classification mapping, correction/removal of the designation, and precedence through later syncs remain open. Targets are informational: spending totals and alerts do not block transaction entry or other actions when exceeded, and do not initiate automatic financial actions.

Targets are available only for expense categories, excluding income categories, Transfers Between Accounts, and Uncategorized. Target amounts may be $0 or positive USD amounts; negative amounts are rejected. An optional unset target is distinct from a configured $0 target.

Category targets automatically repeat each month until changed. Unused budget does not carry over into the next month or increase its target; overspending also leaves the next month's target unchanged. Target edits offer This month only and This month and all future months; future-scoped edits include the selected month and leave earlier months unchanged. Past-month targets cannot be edited, including by the owner, using the same UTC calendar-month cutoff for all members. Future-scoped edits replace existing individual target overrides in the selected range while retaining the approved shared-record change history. Past-month spending totals continue to reflect transaction imports, corrections, recategorization, hiding, and deletion under the approved eligibility rules, while historical targets remain locked.

The past-month target lock also prevents adding or removing targets. Target removal offers This month only and This month and all future months, clearing targets only in the selected range while preserving earlier months and the existing history-retention rules.

For the overspending display, the user initially replied Over target. They subsequently clarified the numeric examples: a $100 target with $120 Spent shows −$20 Remaining, and a $100 target with −$20 Spent shows $120 Remaining. Remaining is target minus Spent without clamping; zero Remaining when overspent is not the selected behavior. Exact Over target indicator placement remains unselected.

The user approved a dedicated Budget navigation section and in-app notifications when spending exceeds a current-month category target. These notifications go to all current household members, only once per category per UTC calendar month, even if spending falls below the target and later exceeds it again. UTC month boundaries match the target-locking rules. Any change putting spending over target can trigger the category's first alert that month, including imports, manual transactions, recategorization, or lowering the target.

Budget opens to the current UTC calendar month, with controls to browse previous and future months. Clicking a category shows the transactions contributing to its spending for the selected month. Detailed controls and layout remain unselected.

The user rejected showing all expense categories, including those with neither spending nor a target. They subsequently approved showing an expense category only if it has a target or contributing transactions in the selected month, even when expenses and refunds net to $0. An Add target action allows selection of any expense category, including one absent from the view, subject to past-month target locks. For categories without a target, Remaining and Over target display a dash (`—`); spending and the No target label remain approved.

## UI design review decisions (October 3, 2026)

- **Sign-in and household setup designed.** The sign-in page offers only Continue with Google. Household setup is a full page without the sidebar: invitations (Decline, Review and join) come first, and Start a new household is always available. Users can sign out there. Accepting goes through a join review that shows the member the user becomes. Creating a household asks for the household name, the creator's nickname and timezone (detected). Users who were removed, left or lost their household see the same screen with a notice about the former household.
- **Net worth chart approved.** Net worth reports were previously listed as not approved. The user approved a net worth/balance history chart at the top of Accounts with 1M/3M/6M/YTD/1Y/ALL ranges and Net worth, Cash, Investments, Credit cards, and Loans views. Other reports, including investment performance calculations, remain unapproved.
- **Accounts grouped by type with totals:** Cash (Cash, Checking, and Savings), Investments, and Credit cards.
- **Loans now listed in Accounts too.** The user first asked for a Loans group on Accounts, withdrew it when reminded of the only-in-Loans rule, then reversed again: Accounts includes a Loans group (with total), loans count in net worth, and the Loans section stays. This supersedes "Loan accounts appear only in Loans."
- **Home list:** below the calendar, the calendar's items are also listed, grouped by week and then by day.
- **Connections management moves to Household:** a Bank connections section on the Household page (connect, sync status, Sync now, remove), usable by all members. Accounts keeps per-account sync status and a link to it. Profile was considered and not chosen, because connections belong to the household, not to a person.
- **Credit card terms and usage:** credit cards gain optional limit, APR, and monthly/yearly fee fields; Accounts shows usage per card and per group; credit card charts can switch to Usage %. The app still doesn't calculate interest; fees are not added to balances.
- **Credit card dates and separate editor:** credit cards get statement closing day, payment due day and next fee date, with optional calendar bills for the payment and fee, edited in a dedicated Edit credit card modal.
- **Credit limit history:** limit changes are recorded as effective-dated entries and shown as a history on the card's page; past usage uses the limit in effect at the time.
- **Modals and pages:** create, edit, mark-paid, cancel, and similar actions use modals. The per-payment Manage modal (status, payment date, transactions) opens from Home calendar items; Bills & Income opens the series editor. Home's Add bill or income button was removed.
- **Forms:** name, amount, repeat, and first date are required for bills, income, and subscriptions; other fields are optional. Forms preview their effect (upcoming dates, balances, usage).
- **Pagination:** long lists use pagination instead of Load more.
- **Loans and subscriptions** share one layout (cards, summary, chart, paginated payments); New/Edit loan, extra payment, mark paid, New/Edit/Cancel subscription, and mark paid are modals.
- **Accounts:** loans show repayment %; Add manual account is a type menu with a separate credit card form; credit cards have their own editor.
- **Phone layout deferred:** design work is desktop-first and the phone mockup was removed from the design. The phone-and-desktop web app requirement is unchanged.

## Prototype documentation reconciliation (October 3, 2026)

The user requested a review of all supplied docs/design prototypes, then asked to apply all suggested changes to the existing docs. The review covered 36 static PNGs and compared them with the current requirements. This request authorizes the documentation corrections and additional coverage/specification work recorded here; it does not mean the PNGs have been edited or that the app/canvas interactions have been tested.

- Corrected the schedules document's stale only-in-Loans statement to match the already-approved Loans-and-Accounts placement, including net worth.
- Removed stale claims that subscription deletion was unresolved and clarified household membership/access instead of obsolete private-account restrictions.
- Recorded existing sign-in/setup layouts and partial main-desktop coverage, without claiming phone reflow, complete supporting workflows, validation, or accessibility were verified.
- Distinguished loan repayment-term edits (all unpaid installments) from account-selection edits (occurrence/future scopes), and documented multiple-account selection for extra payments under the existing loan-payment rule.
- Recorded required prototype corrections: Budget navigation/screens, subscription deletion entry point, hidden attachments, manual transaction/balance workflows, investment designation, inclusive ±7-day suggestion dates, reminder suppression for early-paid installments, optional-field labels, complete pagination exports, and ordinary-member states.
- Updated copy guidance for calendar-only content, household-owned assignments, service cancellation outside the app, date-specific historical reminders, and invitations that require ending any existing household membership. Household deletion already ends membership.
- Added the local prototype coverage matrix, interaction requirements, accessibility/responsive review areas, and acceptance scenarios to [UI design](ui-design.md).
- Added explicit open questions for unknown statement amounts and generated card-bill lifecycle, calculation/missing-history policies, loan reconciliation, save/modal behavior, history/unavailable references, and invitation/access changes. Existing core Budget and household rules remain approved; newly listed choices are not silently selected.

The implementation gate remains unchanged: this is planning/documentation work, not approval to scaffold or code the application.

## Latest ownership and access revision

The user changed the financial ownership model: all household records belong to the household and may additionally be associated with a member. All current household members can view and edit all household records. There are no public/private settings or member-exclusive editing rights.

Accounts, connections, transactions, investments, balances, loans, schedules, payments, attachments, category assignments, and hidden flags stay in the household after member departure. The departing member loses household access; records do not move to a new household. This supersedes personal ownership, portable connections/accounts, attached-transactions-only retention, removal of account selections on member departure, personal financial pages without a household, and personal synchronization without household membership.

The private-account model and account-owner-only editing/category restrictions are also superseded. All household members can view/create/edit/delete financial records/accounts/connections, directly update manual balances, and edit transaction categories and member details. Imported amount/date/payee remain read-only. (Global category definitions were later replaced by household-owned categories.) Member creation/removal, invitations, ownership transfer, and household deletion are confirmed owner-only; these role questions are resolved.

Earlier user-owned/private approvals below are historical context only where explicitly labeled superseded; the current requirements govern.

## Current decisions that replaced earlier proposals

| Topic | Earlier direction | Final approved direction |
| --- | --- | --- |
| Calendar income | Calendar was briefly described as containing only scheduled bills | Scheduled income is also scheduled and shown on the calendar |
| Calendar views | Discussion included visible/selected weeks | Month view only; a summary for every week displayed in the month |
| Income completion | Transaction matching raised the possibility of completion based on attachments | Member explicitly controls received status and amount; attachments do not affect either |
| Recurring edit scope | Recurring change scope needed clarification | This occurrence only, or this occurrence and all future occurrences, for both bills and income |
| Loan interest | Loan total could have implied interest calculation | Enter full repayment total including interest/fees; no APR calculation |
| Extra loan payments | Needed a choice between smaller payments and fewer installments | Keep regular payment amount and reduce remaining installments |
| Financial provider | Lunch Money, SimpleFIN, Plaid, and Lunch Flow were discussed | Lunch Flow Platform API approved |
| Connection creation | Household-owner-only, then personal-connection management | Household-owned connections can be created, edited, and deleted by all current household members |
| Connection ownership | Connections belonged to and moved with a user | Household-owned connections stay in their household; optional member association does not make them portable |
| Private accounts | Private account access was restricted to its personal owner | No private records or public/private setting; all current household members can view/edit all household records |
| Visibility changes | Household-owner control, then account-owner control and private defaults | Visibility controls are removed; all records are visible to current household members |
| Owner removal of a member | Initially described as removing that member's records | Soft deletion with original financial records preserved for history |
| Hidden attached transactions | Needed a choice about removing attachments | Keep attachment; hide transaction display until hidden transactions are shown |
| Category deletion | Earlier user-editable categories left affected records uncategorized; then fixed app-wide categories removed deletion | Household categories can be deleted again; a replacement category of the same type (or Uncategorized) is required and records move to it |
| Manual accounts | Briefly proposed balances without transactions | Manual transactions allowed, but only in manual accounts |
| Manual transaction balance behavior | Needed a choice about balance updates and reversals | Update balance enabled by default on creation; edit/delete does not automatically adjust/reverse it |
| Subscription states | A paused state was possible | Active and Canceled only |
| Subscription cancellation | Needed immediate vs date-based cancellation and whether it can be withdrawn | User chooses effective date; scheduling is final; Active until that date, then Canceled; no reactivation |
| Minimum loan repayment total | A reply briefly allowed reducing the total below paid payments | User corrected that reply: the total cannot be reduced below the amount already paid |
| Private transaction attachments | Private attachment details were first shared, then owner-only | Superseded by removal of private records; all household members can view/edit household transactions and attachments |
| Transaction attachment limit after occurrence deletion | Earlier one-occurrence wording did not distinguish retained deleted-record links | One non-deleted occurrence per transaction; soft-deleted occurrence attachments remain for history and do not prevent reuse |
| Household ownership recipient | Earlier replies allowed any member, including one without a linked Google account | User corrected the misunderstanding: only another current household member with a linked Google account can receive ownership |
| Category definition management | Household-owner-only, then all-member, then fixed app-wide definitions | Household-owned categories with one level of subcategories, managed by all members (October 3, 2026) |
| Transaction category assignment | Restricted to the account owner/household owner, with private owner-only access | All current household members can assign the household's categories and subcategories |
| Loan account balance effects | Earlier scheduled status changes did not change any financial account balance | Loan repayments are an exception: paid installments/extra payments reduce the Loan account balance; reversals/corrections recalculate it, with history retained |

## Other explicit approvals

- Web app with Laravel, Inertia, Vue 3, TypeScript, Tailwind CSS, PostgreSQL, and Redis.
- Google-only authentication and USD only.
- Separate household-member logins and one household per user.
- Members without logins, later linkable through invitations.
- Member creation/removal, invitations, household deletion, and ownership transfer are confirmed owner-only. All members can edit household/member details and create/edit/delete household financial records/accounts/connections. Category definitions remained fixed app-wide at the time (superseded October 3, 2026 by household-owned categories).
- Invitations to not-yet-registered Google email addresses, accept/decline, cancelable without automatic expiry.
- Household deletion and relationships use soft deletion; no household restore.
- Shared bill amount; assignment organizes records without splitting payment shares.
- Per-occurrence paid/unpaid and received/not received status.
- Multiple transaction attachments per occurrence; each transaction attaches to one non-deleted occurrence while historical links to soft-deleted occurrences can be retained.
- Monthly, weekly, biweekly, twice-monthly, yearly, and one-time schedules.
- Missing monthly dates use the last day; weekend dates do not move.
- Expected-income and scheduled-bill summaries grouped by scheduled/due date.
- Loans and subscriptions appear on the calendar and count as bills in summaries.
- In-app due-date reminders, selected recipients, personal timezone/time, default 9 AM.
- All current household members can view/edit household transactions, notes, categories, and attachments; there is no private account mode.
- Imported amount, date, and payee remain read-only.
- Provider-supplied pending transactions appear with a Pending label. Both pending and posted transactions may be attached or suggested as matches under existing eligibility rules; a posted-only restriction was rejected.
- Pending-to-posted transitions retain one app transaction with its notes, category, hidden setting, and attachments. Sync automatically applies bank/provider corrections to amount, date, and payee, preserving previous values in change history; imported fields remain read-only for members.
- Predefined app-wide categories for transactions, bills, and income (superseded October 3, 2026: categories are household-owned, seeded from that list, with subcategories).
- Balance history and preserved deleted-record history without restore features.
- Shared-record change history showing who changed the record, when, and the previous/new values.
- Household connections continue syncing after the authorizing member leaves while provider authorization remains valid. Invalid authorization and reauthorization remain open.
- Every household member can use Sync now. After reviewing the provider research, the user selected hourly automatic synchronization of the latest available Lunch Flow data. Hourly bank-data refreshes are not guaranteed; quotas and forced-refresh capabilities require validation.
- Additional requests for a connection already syncing reuse its running sync; temporary sync failures do not trigger automatic retries. The normal hourly schedule and member-requested Sync now remain approved. Technical concurrency mechanisms and detailed status/error presentation are unselected.
- Sync now is available immediately after an attempt finishes, with no app-imposed cooldown. Provider limits still apply. Sync failures do not send in-app notifications to household members.
- Connection details show the last successful sync time and latest error. If some accounts succeed and others fail, retain the successful updates and identify which accounts failed. The connection's last-success time updates only when all its accounts succeed in that sync; each account has its own last-success time. An account's displayed error clears after its next successful sync. Detailed presentation and technical storage remain unselected.
- Each connected account has its own inclusive import starting date. Moving it later keeps all already-imported transactions, including those before the new starting date. Moving it earlier automatically imports available older transactions on the next sync, including transactions dated on the new starting date; existing deleted transactions are not restored.
- Initial account setup defaults to the first day of the current month in the profile timezone of the member setting up the account. Accounts discovered later in an existing connection import automatically from their UTC discovery calendar date, without waiting for a member to confirm their starting date. These timezone rules are approved.
- Soft-deleting a household stops synchronization and disconnects its bank connections, preserving imported history. Provider disconnect/revocation mechanics remain open.
- Member-deleted imported transactions are soft-deleted and remain deleted even when later syncs return them; no recreation or restoration.
- Bank/provider-removed transactions are also soft-deleted, preserving history and existing attachments.
- Deleted transaction details are not displayed through existing attachments; displaying them with a Deleted label was rejected. Historical links remain preserved; any placeholder presentation is unselected.
- Member departure/removal leaves all financial records in the household; remaining members retain viewing/editing access and the departing member loses access. No records automatically migrate.
- Removing a transaction attachment removes that link, not general household transaction access.
- All household members can edit manual account details and directly update manual balances.
- Subscription cancellation stops unpaid payments due on or after its effective date, while preserving already-paid occurrences in the calendar and history.
- A subscription remains Active until its cancellation date and becomes Canceled on that date. Scheduling cancellation is final; members cannot change the date or withdraw cancellation before it takes effect.
- Users can add existing loans and record payments already made.
- Members can change a loan's repayment total, regular installment amount, or schedule after payments exist, while preserving paid history.
- Repayment-term changes affect all unpaid installments, including overdue installments; paid history is preserved.
- The app prevents extra payments larger than the loan's remaining balance.
- An existing loan may start from only its current remaining balance, without recording past payments.
- Overdue loan installments retain their original due dates; later installments continue on schedule unless repayment terms are changed.
- Fully repaid loans are labeled Paid off, hidden from the loan list by default, and available through a filter to show paid loans.
- Extra payments are always paid when entered and use a member-selected date. The regular installment paid/unpaid toggle does not apply to extra payments.
- Members can edit an extra payment's amount/date or soft-delete it to correct a mistake, preserving history and recalculating the remaining balance and unpaid installments.
- The repayment total cannot be reduced below the amount already paid. This replaces the earlier reply allowing that change; the resulting negative-balance display question is no longer open for this scenario.
- Bills, subscriptions, loan payments, and income support optional selection of zero, one, or multiple household accounts. All household accounts are eligible and their names are visible. Detailed similarity scoring, tie handling, provider/manual sign normalization, and matching presentation still require planning.
- Account-selection changes on recurring records offer This occurrence only or This occurrence and all future occurrences; future-scoped changes preserve earlier occurrences.
- Match suggestions use only selected accounts; if no accounts are selected, no suggestions are shown. The user selected this rather than the proposed fallback to all accessible accounts.
- Matching suggestions rank eligible transactions using amount, date, and payee similarity to the bill/income name. Consider transactions within seven days before through seven days after the scheduled date, including both boundary dates. The suggestion window does not restrict manual attachments.
- Suggestions require an exact match to the occurrence amount; different-amount suggestions, including partial payments, were rejected. This does not restrict manual attachments or change occurrence amount/status behavior.
- Bill, subscription, and loan-payment suggestions use outgoing transactions only; income suggestions use incoming transactions only. Among exact-amount matches, the user selected option B: closeness to the scheduled date takes priority over payee/name similarity. Suggestion direction restrictions do not limit manual attachments.
- Persistent dismissal for an occurrence across the whole household was rejected. The user subsequently selected option C: matching suggestions have no dismiss option. This resolves dismissal behavior without selecting household-wide, per-member, or temporary dismissal. Notification dismissal remains separately approved.
- Matching suggestions remain available for already-paid bills and already-received income. The user selected option B: initially display the top five ranked suggestions, with Show more for additional eligible matches. Superseded on Oct 3, 2026: only the top five are shown, with no Show more or pagination; other transactions are attached manually.
- Selecting accounts and marking ordinary bills/subscriptions paid or income received leaves financial account balances unchanged. Loan repayments are now an exception: paid installments and extra payments automatically reduce the Loan account balance; reversals/corrections recalculate it. Selected paying accounts are not automatically debited. Other account balance changes continue through provider imports, manual transaction creation with its balance option, and direct manual balance updates by any current household member.
- Members can manually attach any accessible transaction, regardless of selected accounts, including when no account is selected. Selected accounts restrict suggestions only.
- Account deletion removes its selection relations; member departure alone does not. Privacy-change selection/name-masking workflows are superseded by removal of private records.
- Paid items skip their due-date reminders.
- Creating a new unpaid item due today after a selected member's reminder time does not trigger an immediate reminder for that member.
- Notifications support read/unread status and Mark all as read.
- After an occurrence's due date or reminder settings change, another reminder can be sent at the updated scheduled date/time. The user selected this over a lifetime one-reminder-per-member-per-occurrence limit. Paid-item suppression continues to apply.
- Opening a notification automatically marks it read.
- Users can dismiss notifications while retaining them in notification history.
- The user rejected extending the no-immediate-catch-up rule to recipient additions or schedule changes on existing items. Existing unpaid items due today trigger immediate catch-up after those changes if the relevant scheduled time has passed; newly created items keep the no-catch-up rule.
- Notification history, including dismissed notifications, is retained indefinitely; automatic deletion after a fixed retention period was not selected.
- Changing an existing item's due date to yesterday or an earlier calendar day does not trigger an immediate reminder.
- Daylight saving changes use the next valid local time when a reminder time is skipped, and send once at the first occurrence when that local time repeats.
- Deleting an account preserves already-attached transactions and their attachments for household history; account-selection relations are removed separately.
- Soft-deleting a manual transaction preserves its existing attachments for history.
- Scheduled occurrences are soft-deleted with transaction attachments retained. Their transactions can attach to another non-deleted occurrence while remaining historically attached to deleted occurrences.
- Recurring bills and income support optional inclusive end dates; occurrences due on that date are included, and later occurrences are not scheduled.
- If both twice-monthly dates fall back to the same last day of a short month, retain two separate occurrences rather than merging them.
- Future-series edits preserve already-paid bill occurrences and received income occurrences unchanged, including future-dated completed occurrences.
- For incomplete future occurrences, series edits replace individual overrides only for the fields being changed; unrelated overrides remain unchanged.
- Record actual payment and received dates separately from scheduled/due dates, defaulting to today and editable by household members. Summary periods remain based on scheduled/due dates.
- Unpaid items past their due date display an Overdue label while remaining on their original calendar date.
- Deleting a subscription soft-deletes it and all its occurrences, including paid occurrences, while preserving history and transaction attachments. No restore is available.
- If a preserved paid subscription occurrence due on or after the cancellation effective date is changed to unpaid, soft-delete it and retain history and attachments. The user selected this over preventing the status change.
- Use a member's household nickname on assigned records, including after departure/removal. The user specified the nickname rather than approving the proposed Former member label.
- Ownership transfer is immediate and requires no recipient approval; the previous owner loses owner permissions when it takes effect.
- Only another current household member with a linked Google account can receive ownership. The user corrected their earlier misunderstanding, superseding the decisions that allowed unlinked recipients and left owner-only actions unavailable. The unlinked-owner account-linking question no longer applies.
- Multiple pending invitations from the same household to the same Google email are allowed. The user rejected requiring cancellation of an existing invitation before sending a replacement.
- Accepting one invitation automatically cancels the other pending invitations from that same household to that Google email. This rule is scoped to that household and email.
- Earlier personal financial pages and personal synchronization without a household are superseded. The newer required-household-setup rule also supersedes normal Profile access without a household; creating a household or directly accepting an invitation both satisfy setup. Required-setup layouts now exist; technical enforcement and invalid-bank-authorization flows require planning. Household connections continue syncing after authorizing-member departure while provider authorization is valid.
- Transaction category assignments and hidden flags belong to household records and remain there when a member leaves. There is no personal account migration.
- All household members can assign transaction categories under the latest all-member editing rule.
- The user replaced both earlier household-owner-only and all-member category-definition management with fixed app-wide categories. No app user can create, edit, or delete definitions. Permissions to assign existing categories to records remain as approved. **Superseded October 3, 2026:** categories are household-owned and managed by all members, with subcategories.
- Manual account types were Cash, Checking, Savings, Credit Card, Loan, and Other (Loan added after the initial five). Superseded on Oct 3, 2026: the user removed the Other type, and loans are created only from the Loans page.
- Manual account entry requires name, type, current balance, and balance date; institution name and notes are optional. There is no visibility setting.
- Credit card and Loan debt display as a positive amount owed, such as $500 owed.
- Repayment schedule configuration is optional and inside the loan, replacing the proposed account-to-schedule linking flow. A Loan account may track only its balance. Loan accounts were then listed only in Loans (superseded on Oct 3, 2026: they also appear in Accounts). Reconciliation with manual/provider account updates still requires planning.
- All household records, including Loan accounts, are visible/editable by current household members. Configured installments appear on the household calendar.
- Paid installments and extra payments automatically reduce the Loan account balance. Reversals/corrections recalculate it with balance history retained. This replaces the earlier no-scheduled-status-balance-change rule specifically for the Loan account; selected paying account balances are unaffected by scheduled status alone.
- Superseded: loan accounts appeared only in Loans, after the user rejected listing them in both. As of Oct 3, 2026 they are listed in both Accounts and Loans.
- Member departure leaves loans, balances, schedules, past payments, unpaid installments, and attachments in the household and leaves its calendar unchanged. Remaining members can still edit them. There is no portable personal loan or automatic new-household schedule.

## Superseded private transaction permission clarification

When asked who can detach a private-account transaction attached to a shared record, the user answered that only the account owner can see and manage private-account transactions. When asked who can edit its notes/category, the user answered all household members.

Earlier clarifications restricted private transaction access to the personal account owner and later restricted public category assignment to the account owner or household owner. These role/privacy decisions are now superseded: all financial records are household-owned and all current members can view/edit them. There are no private transactions or private attachment exceptions. Record category assignment is shared; category definitions are now household-owned and editable by all members.

## Resolved subscription cancellation questions

After approval of subscription effective-date cancellation and no reactivation, the assistant asked:

1. Should payments due on the cancellation effective date be excluded?
2. Should already paid occurrences on or after that date remain in the calendar and history?

These questions were unanswered when the initial documentation was created. The user subsequently approved excluding payments on the effective date and preserving already-paid occurrences in the calendar and history. The requirements and open-decisions documents now reflect those answers.

The user also approved soft-deleting a preserved paid occurrence if it is later changed to unpaid and its due date is on or after the cancellation cutoff. Subscription deletion separately soft-deletes the subscription and all its occurrences, including paid occurrences; history and transaction attachments remain and no restore is available.

## Maintaining this record

When the user approves another decision, update the applicable requirements and open-decisions documents. If it changes an earlier rule, record the replacement here so the implementation does not follow a superseded policy.

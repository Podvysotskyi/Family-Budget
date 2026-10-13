# UI design

The design lives on the canvas **Household Finance UI** (claude.ai/artifact/MYLQ8SKXjcu18mGWtVhDfn). Its 81 screens are exported as 2× PNGs in [docs/design](design/), one folder per canvas page; see the [screen inventory](#screen-inventory). The canvas is the source: change it first, then re-export.

This document describes what the design settles. Product rules live in the other documents and are linked where a screen depends on them. The user reviewed the design screen by screen on October 3, 2026 and asked Claude to decide design details itself, flagging only changes to approved rules. Design choices that go beyond the approved rules are listed in [Open decisions](open-decisions.md#design-proposals-awaiting-confirmation).

## Scope and conventions

- **Desktop only for now.** Phone layouts are out of the design scope (user decision, October 3, 2026).
- **Visual direction:** clean and professional, light theme only, IBM Plex Sans with tabular numbers. Near-black for primary actions, blue for income and information, orange for overdue, warnings, errors and destructive actions. States are never shown by color alone. The app name is a placeholder ("[App name]"). Tokens and components: [Component library](component-library.md).
- **Modals** for creating, editing and quick actions (mark paid, cancel, delete); lists and detail pages stay on screen. Destructive actions use a confirmation that lists the consequences.
- **Pagination, never "Load more".** Long lists and tables use page numbers, previous/next, "Showing X–Y of N" and 10/25/50 rows per page. Matching suggestions are the exception: only the top five, then "Find a transaction".
- **Required fields:** optional fields are labeled "Optional"; every form says "All fields are required unless marked Optional." Assignment and reminders are always optional; "Entire household" means no individual assignee.
- **Previews before saving** wherever the effect isn't obvious: upcoming dates, loan balance and schedule, card usage, budget target changes, category moves.
- **Money:** outflows "−$64.12", inflows "+$3,800.00" in blue, debts as a positive amount "owed", signed Remaining, "—" where a value doesn't apply.
- **Category paths** are shown as "Parent › Subcategory" everywhere; category pickers are grouped and searchable.

## Shell and navigation

- **Top bar** on every signed-in page: logo and app name (to Home); notifications bell with unread count; account (avatar, name, Google email, to Profile); **Sign out**. Setup screens use it without the bell and Profile link.
- **Sidebar:** household card (name, member count, role), then five sections with icons — **Home**, **Bills & Income** (Subscriptions), **Accounts** (Loans, Investments), **Budget** (Transactions), **Household** (Categories). Sub-pages appear only for the current section, as text aligned under its label; other sections show a collapsed chevron. The current page has the dark fill; on a sub-page its section label turns bold. No household switcher (one household per user).
- Modals cover the whole page, including the top bar.

## Website

A public landing page (proposal; not in the written requirements): header (Features, How it works, Questions, Sign in, Get started); hero with the headline "Your household's bills, income, loans and subscriptions on one calendar.", Get started with Google and a calendar mock; six features; three setup steps; a "watch your money, not move it" section; FAQ; final call to action. No pricing (undecided).

## Sign-in and household setup

- **Sign in:** product summary plus a single **Continue with Google** button and a note for invitees. Closing the Google window shows "Sign-in didn't finish".
- **Household setup** (no sidebar), for any signed-in user without a household: invitations to the user's Google email first (household, inviter, date, members, "you'll join as…"; Decline and **Review and join**), then **Start a new household**. With no invitations it explains which email to share, with Check again.
- **Join household** review: the member you become (bills already assigned stay assigned to that member), current members, and what joining means (full access; other pending invitations from that household to your email are canceled; invitations from other households stay in Profile).
- **Create household:** name, your nickname (from Google) and timezone (detected), with an "After you create it" note.
- **After removal, leaving or deletion:** the setup screen with a notice naming the former household; its records stay with it.

## Home

- **Month calendar** (Monday first) with Show paid bills, summary tiles (expected income, total due, paid, unpaid) and weekly totals; totals always include paid items. Items are styled as bill, income, overdue (on the original date) and paid; hidden paid items leave "N paid hidden".
- **Busy days** show three items (overdue first, then unpaid, then paid) and "+N more", which opens the day's full list with totals.
- **Items by week** below the calendar lists the same items by week and day.
- **First run:** a shared "Get set up" checklist (connect a bank, add bills and income, invite people) with progress and Hide, above an empty calendar.
- **Manage payment** (click any calendar item or bill reminder): previous/next payment; amount with "Change amount for this payment"; payment date (defaults to today) and Mark as paid; paying account, reminders, assignee; attached transactions with Detach; top-five suggestions; Find a transaction across all accounts; Delete…, Change history, Edit bill, Done. A transaction already attached to another non-deleted payment shows as "Attached".
  - **Attachments:** hidden ones are collapsed behind Show hidden; deleted ones show as a "Deleted transaction" placeholder with no details. Attached amounts never change the payment's amount or status.
  - **Income** uses the same modal: Mark as received, received-date correction, Mark as not received; no reminders.
- **Change history** (shared pattern, opened from Manage and other records): actor, time in your timezone, field-level old → new values; bank/system changes labeled; former members named; deleted transactions shown only as "A deleted transaction".

## Bills & Income and Subscriptions

- **Bills & Income list:** bill and income series (schedule, next due, amount, assignee) with All/Bills/Income filters and search; clicking a name opens Edit.
- **New/Edit bill, New income:** name, amount, repeats, first date (required); category, end date, assignee, paying/receiving accounts (any household account, including investments and loans) and reminder recipients (optional). Upcoming-dates preview. Edit asks for **this occurrence only** or **this and all future occurrences**. Income has no reminders. **Twice a month** uses two day-of-month pickers; each date is its own payment.
- **Subscriptions** (same layout as Loans): cards with Show canceled; summary (amount, next payment, paid this year, paid since start); Payments by month chart; paginated payments table.
- Subscription modals: **New** (no end date), **Edit** (occurrence/future scope), **Cancel** (effective date; "This stops tracking future payments in the app. Cancel with the service separately."; can't be changed or withdrawn), **Mark payment paid** (suggestions only from 7 days around the due date; Find a transaction for early payments) and **Delete** (removes all payments including paid ones; points to Cancel instead).

## Accounts, Loans and Investments

- **Accounts:** groups Cash, Investments, Credit cards and Loans with totals; card usage against limits; loan repayment progress ("50% repaid · $6,300 of $12,600"; none for balance-only loans). Balance history chart (Net worth, Cash, Investments, Credit cards, Loans; 1M–ALL); the Credit cards view can switch to Usage %. **Add manual account** menu: Cash, Checking, Savings (one form) or Credit card (own form); loans are added from Loans.
- **Connected account detail:** balance chart with ranges (cards: Amount owed / Usage %, limit changes marked), connection panel, credit-limit history, transactions with search, Show hidden and pagination. **Edit account details**, **Edit credit card** (limit, APR, statement and payment days, fee and next fee date; calendar bills that turn on once their fields are set), **Change credit limit**.
- **Manual account detail:** Update balance and Add transaction; a list mixing transactions and balance updates with their balance effect. **Add transaction** (manual accounts only; Money out / Money in; Update balance on by default with before → after), **Edit transaction** (saving never changes the balance), **Update balance** (no transaction created; kept in history), **Delete account**.
- **Loans:** cards with Show paid off; summary; Balance over time chart (paid solid, scheduled dashed, Today marker); paginated payments. **New loan** (new; existing with past payments — past installments pre-checked as paid; existing from today's balance), **Edit loan** (repayment terms apply to every unpaid installment; paying accounts have their own "this installment / this and all future" scope), **Edit balance-only loan** (amount owed and date; schedule switch), **Record extra payment** (any number of paying accounts; preview), **Correct extra payment** (amount/date or delete), **Mark installment paid**.
- **Investments** (proposal): account switcher, value/gain/cash tiles, holdings and trading activity.

## Budget and Transactions

- **Budget month view:** opens to the current UTC month; previous/next and "Back to [current month]". Summary: Spent, Targets, Remaining in targeted categories, Over target. **Spending by category** table (transactions, bar, Spent, Target, Remaining, Over target): No target and dashes for untargeted categories, Uncategorized as a reporting group, $0 targets distinct from none, negative Spent and signed Remaining as-is, orange "Over by" badges. A footnote states the eligibility rules.
- **Selected category panel:** totals, over-target note (alerted once this month), By subcategory breakdown, contributing transactions (Pending/Refund labels, pagination), Edit target or Set a target, Open in Transactions.
- **Past months** are locked (spending can still change); **future months** explain that targets repeat.
- **Target modals:** Add (top-level expense categories only; $0 allowed; this month only or this and all future months), Edit (shows later month-specific changes it would replace), Remove (same scopes). Over-target alerts appear in Notifications.
- **Transactions:** paginated table with search, account and category filters and Show hidden; Pending labels; "Add manual transaction" (manual accounts only). Side panel: category, notes, **Investment purchase or sale** (leaves it out of Budget), **Attach to scheduled payment…** (bills, income, subscriptions, loan installments), Hide, Delete, change history. Imported amount, date and payee are read-only.

## Household and Categories

- **Household (owner):** household name with Save; members (owner badge, Edit, Remove, Invite); pending invitations; **bank connections** (Connect, Sync now, Details, Remove); transfer ownership; leave or delete.
- **Household (member view):** names and connections editable; no member admin, invitations, transfer or delete; Leave household. **Edit member** without Remove for members.
- **Bank connections:** **Connect a bank** (per-account import dates defaulting to the 1st of the month; later-found accounts import automatically), **Connection details** (expired-consent Reconnect state, last full success, latest error, per-account status and import dates, newly found accounts), **Remove connection** (history kept).
- **Member dialogs:** Add member (Google invitation or no login), Edit member, Remove member. **Confirmations:** Transfer ownership (only members signed in with Google; immediate), Leave household (to setup), Delete household (type the name).
- **Categories:** Expense, Income and Transfers tabs; tree of categories and subcategories with transaction count, what uses it and Budget target; Add subcategory, Edit, Delete; built-in badges (Loan Payments: subcategories only; Transfers Between Accounts: no actions). **Add/Edit category** (type fixed after creation; one level of nesting; path preview) and **Delete category** (required "Move everything to" replacement; target consequences).

## Notifications and Profile

- **Notifications:** All / Unread / Dismissed, Mark all as read, unread markers, dismiss, pagination. Reminder headlines keep the original due date ("Electric · $118.00 due Wed, Sep 30") with the current status as a badge; items paid before reminder time send none. Budget alerts link to Budget.
- **Profile:** Google account and Sign out; timezone and reminder time (default 9:00 AM); your household; incoming invitations. Accepting is disabled while you're in a household — owners are told to transfer ownership and leave, or delete the household; members to leave first.

## States and feedback

- **Toasts:** dark for success and progress, white with an orange edge for errors; bottom-right, newest on top, at most three; success hides after 5 seconds, errors stay. Undo only for reversible actions.
- **Inline messages** at the top of the page or modal: failed save (Try again), changed by someone else, lost access, record deleted, offline. Blocking problems never appear only as a toast.
- **Working buttons** keep their width and show a spinner ("Saving…").
- **Loading:** skeletons shaped like the content, shown after 300 ms; refreshes dim existing content instead. No shimmer with reduced motion.
- **Validation:** checked on blur and submit; a focused error summary links to each field; orange border, icon and message per field.
- **Failed save:** the modal stays open with values kept; the primary button becomes Try again; closing asks to discard.
- **Empty states** for every list: what's missing and the next action; "no matches" always offers Clear filters; totals stay at $0.00.

## UI components

The **UI components** canvas page shows the design tokens and every reusable component with its variants and states (Foundations, Buttons and forms, Feedback and overlays, Data display and layout, Finance components). The **Shared components** page holds the live top bar and sidebar used by every page. The build inventory is in [Component library](component-library.md).

## Screen inventory

| Canvas page | Screens (PNG exports) |
| --- | --- |
| Website | [Landing page (public website)](<design/Website/Landing page (public website)@2x.png>) |
| Sign-in & setup | [Sign in](<design/Sign-in & setup/Sign in@2x.png>) · [Sign in — Google window closed](<design/Sign-in & setup/Sign in — Google window closed@2x.png>) · [Household setup — invitations waiting](<design/Sign-in & setup/Household setup — invitations waiting@2x.png>) · [Join household — review invitation](<design/Sign-in & setup/Join household — review invitation@2x.png>) · [Create household](<design/Sign-in & setup/Create household@2x.png>) · [Household setup — after removal, no invitations](<design/Sign-in & setup/Household setup — after removal, no invitations@2x.png>) |
| Home | [Home — calendar (desktop)](<design/Home/Home — calendar (desktop)@2x.png>) · [Manage bill payment (modal) — opens from calendar](<design/Home/Manage bill payment (modal) — opens from calendar@2x.png>) · [Manage income payment (modal) — received, date correction](<design/Home/Manage income payment (modal) — received, date correction@2x.png>) · [Manage payment — hidden and deleted attachments (state)](<design/Home/Manage payment — hidden and deleted attachments (state)@2x.png>) · [Change history (modal) — shared pattern for every record](<design/Home/Change history (modal) — shared pattern for every record@2x.png>) · [Home — first run (new household)](<design/Home/Home — first run (new household)@2x.png>) · [Calendar — busy day overflow (+N more)](<design/Home/Calendar — busy day overflow (+N more)@2x.png>) |
| Bills & Income | [Bills & Income — list](<design/Bills & Income/Bills & Income — list@2x.png>) · [Edit bill (modal)](<design/Bills & Income/Edit bill (modal)@2x.png>) · [New bill (modal)](<design/Bills & Income/New bill (modal)@2x.png>) · [New income (modal)](<design/Bills & Income/New income (modal)@2x.png>) · [New income — twice a month (modal)](<design/Bills & Income/New income — twice a month (modal)@2x.png>) |
| Loans | [Loans](<design/Loans/Loans@2x.png>) · [New loan (modal)](<design/Loans/New loan (modal)@2x.png>) · [Edit loan (modal)](<design/Loans/Edit loan (modal)@2x.png>) · [Record extra payment (modal)](<design/Loans/Record extra payment (modal)@2x.png>) · [Mark installment paid (modal)](<design/Loans/Mark installment paid (modal)@2x.png>) · [New loan — existing loan with past payments (modal)](<design/Loans/New loan — existing loan with past payments (modal)@2x.png>) · [Edit balance-only loan (modal)](<design/Loans/Edit balance-only loan (modal)@2x.png>) · [Correct extra payment (modal)](<design/Loans/Correct extra payment (modal)@2x.png>) |
| Subscriptions | [Subscriptions](<design/Subscriptions/Subscriptions@2x.png>) · [New subscription (modal)](<design/Subscriptions/New subscription (modal)@2x.png>) · [Edit subscription (modal)](<design/Subscriptions/Edit subscription (modal)@2x.png>) · [Cancel subscription (modal)](<design/Subscriptions/Cancel subscription (modal)@2x.png>) · [Mark payment paid (modal)](<design/Subscriptions/Mark payment paid (modal)@2x.png>) · [Delete subscription (confirm)](<design/Subscriptions/Delete subscription (confirm)@2x.png>) |
| Accounts | [Accounts by type](<design/Accounts/Accounts by type@2x.png>) · [Account detail — Chase Sapphire](<design/Accounts/Account detail — Chase Sapphire@2x.png>) · [Add savings account (modal) — Cash/Checking/Savings](<design/Accounts/Add savings account (modal) — Cash Checking Savings@2x.png>) · [Add credit card (modal)](<design/Accounts/Add credit card (modal)@2x.png>) · [Edit account details (modal) — non-card accounts](<design/Accounts/Edit account details (modal) — non-card accounts@2x.png>) · [Edit credit card (modal)](<design/Accounts/Edit credit card (modal)@2x.png>) · [Change credit limit (modal)](<design/Accounts/Change credit limit (modal)@2x.png>) · [Account detail — manual savings](<design/Accounts/Account detail — manual savings@2x.png>) · [Add manual transaction (modal)](<design/Accounts/Add manual transaction (modal)@2x.png>) · [Edit manual transaction (modal)](<design/Accounts/Edit manual transaction (modal)@2x.png>) · [Update balance (modal)](<design/Accounts/Update balance (modal)@2x.png>) · [Delete account (confirm)](<design/Accounts/Delete account (confirm)@2x.png>) |
| Investments | [Investments — holdings and activity (proposal)](<design/Investments/Investments — holdings and activity (proposal)@2x.png>) |
| Transactions | [Transactions](<design/Transactions/Transactions@2x.png>) |
| Budget | [Budget — month view](<design/Budget/Budget — month view@2x.png>) · [Add target (modal)](<design/Budget/Add target (modal)@2x.png>) · [Edit target (modal)](<design/Budget/Edit target (modal)@2x.png>) · [Remove target (modal)](<design/Budget/Remove target (modal)@2x.png>) |
| Household | [Household — members & bank connections](<design/Household/Household — members & bank connections@2x.png>) · [Add member dialog](<design/Household/Add member dialog@2x.png>) · [Edit member dialog](<design/Household/Edit member dialog@2x.png>) · [Remove member dialog](<design/Household/Remove member dialog@2x.png>) · [Connect a bank (modal) — choose import dates](<design/Household/Connect a bank (modal) — choose import dates@2x.png>) · [Connection details (modal) — reconnect, new account, import dates](<design/Household/Connection details (modal) — reconnect, new account, import dates@2x.png>) · [Remove connection (confirm)](<design/Household/Remove connection (confirm)@2x.png>) · [Household — member view (not owner)](<design/Household/Household — member view (not owner)@2x.png>) · [Edit member dialog — member view (no Remove)](<design/Household/Edit member dialog — member view (no Remove)@2x.png>) · [Transfer ownership (confirm)](<design/Household/Transfer ownership (confirm)@2x.png>) · [Leave household (confirm, member)](<design/Household/Leave household (confirm, member)@2x.png>) · [Delete household (confirm, owner)](<design/Household/Delete household (confirm, owner)@2x.png>) |
| Categories | [Categories — household-owned, with subcategories](<design/Categories/Categories — household-owned, with subcategories@2x.png>) · [Add category (modal)](<design/Categories/Add category (modal)@2x.png>) · [Edit category (modal)](<design/Categories/Edit category (modal)@2x.png>) · [Delete category (modal)](<design/Categories/Delete category (modal)@2x.png>) |
| Notifications & Profile | [Notifications](<design/Notifications & Profile/Notifications@2x.png>) · [Profile](<design/Notifications & Profile/Profile@2x.png>) |
| States & feedback | [Toasts & inline messages](<design/States & feedback/Toasts & inline messages@2x.png>) · [Loading — Transactions skeleton](<design/States & feedback/Loading — Transactions skeleton@2x.png>) · [Validation errors — New bill](<design/States & feedback/Validation errors — New bill@2x.png>) · [Failed save — Edit subscription](<design/States & feedback/Failed save — Edit subscription@2x.png>) · [Empty states — every list](<design/States & feedback/Empty states — every list@2x.png>) |
| Shared components | [Navigation (shared)](<design/Shared components/Navigation (shared)@2x.png>) · [Top bar (shared)](<design/Shared components/Top bar (shared)@2x.png>) |
| UI components | [Foundations — tokens](<design/UI components/Foundations — tokens@2x.png>) · [Buttons and form controls](<design/UI components/Buttons and form controls@2x.png>) · [Feedback and overlays](<design/UI components/Feedback and overlays@2x.png>) · [Data display and layout](<design/UI components/Data display and layout@2x.png>) · [Finance components](<design/UI components/Finance components@2x.png>) |

## Behavior to specify before building

The screens show the intended behavior; these details still need a decision (tracked in [Open decisions](open-decisions.md)):

| Area | Still to decide |
| --- | --- |
| Save and modals | Household name save feedback; unsaved-change handling for Cancel, close, backdrop, navigation and payment switching; modal scroll/footer rules and nested modals (Edit card → Change limit). |
| Occurrence context | How an edit from the series list chooses the occurrence anchoring "this occurrence" and "all future". |
| Credit card bills | An occurrence before the statement amount is known; how card setting changes, switches and card deletion update generated bills. |
| History and charts | Balance history start and gaps, missing/zero card limits, credit balances, subscription "a month" equivalents. |
| Access changes | What an open page or modal does when a member is removed, an invitation is canceled or ownership changes mid-edit. |
| Accessibility | Target level and supported browsers; keyboard, focus and chart behavior to verify in the built app. |

## Accessibility review

Not a selected certification level. Verify in the built app: keyboard access to navigation, calendar items, pickers, tables, pagination and every modal action; visible focus, dialog labeling and focus return; announcements for saves, errors and sync results; text contrast, status indicators beyond color, chart text alternatives; long names, large amounts, dense days and long lists. Static exports don't verify any of this.

## Acceptance scenarios

Checks of approved behavior, not a test plan. Add cases for open calculations once they are decided.

| Scenario | Expected result |
| --- | --- |
| October 21 subscription payment and transactions on October 3, 14, and 28 | October 14/28 can be suggestions if all other rules pass; October 3 cannot, but may be attached manually. |
| No selected accounts, an already-paid payment, and an unrelated accessible transaction | No suggestions without selected accounts; eligible suggestions still work after payment; manual attachment remains available across household accounts. |
| Twice-monthly dates 30 and 31 in February | Two independent occurrences on the last day, each with its own amount, status, and attachments. |
| Future bill edit changes only the date | Completed occurrences remain unchanged; incomplete amount overrides remain because amount was not edited. |
| Loan repayment-term change alongside an account-selection change | Term change uses all unpaid installments; account selection uses its own occurrence/future scope. Paid history is preserved. |
| $6,300 remaining loan, $420 installments, $500 extra payment | $5,800 remains, with 14 installments and a final $340 installment; regular amount stays $420 and paying-account balances are not debited. |
| Subscription cutoff October 15 and already-paid October 20 occurrence | Unpaid October 15/later occurrences stop; paid October 20 remains. Reversing it to unpaid soft-deletes it, retaining attachments. Deleting the subscription also soft-deletes earlier/paid occurrences. |
| Hide an attached transaction, then delete it | Hiding retains the link and allows details through Show hidden; deletion retains the link but never reveals transaction details through it. |
| Pending transaction posts or receives a provider correction | One transaction remains with notes/category/hidden flag/attachments intact; corrected source fields update with history; Budget does not count a duplicate. |
| Create, edit, and delete a manual transaction | Creation defaults Update balance on; editing/deletion does not adjust/reverse its prior effect. A separate balance update is available. |
| One of two connection accounts fails | Successful account updates remain; connection last-full-success stays unchanged; failed account/error are identified; no in-app failure notification or automatic retry. |
| September 5 installment marked paid September 4 | No September 5 due-date reminder if it remains paid at reminder time. |
| Budget target $100 with $120 spent, or −$20 spent | Remaining is −$20 or $120 respectively. No target shows dashes; $0 target remains distinct. Past-month target changes are blocked while historical spending may still update. |
| Budget first over-target crossing, then another crossing in the same UTC month | All current members are alerted once for that category/month; no second alert. Targets do not block actions. |
| Ordinary member opens Household/Edit member | Household/member editing and connection management are available; member administration, transfer, and household deletion are not. |
| Member removed while editing; user joins another household later | Former-household access ends; user returns to setup and no records move into the new household. |
| Category deleted with a replacement | All its transactions, bills and subcategories move to the replacement in every month; its target is removed from the current and future months; locked past months keep it, marked deleted. |

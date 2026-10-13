# Component library

This is the inventory of reusable UI components needed to build the app from the [UI design](ui-design.md), using the approved stack (Laravel + Inertia + Vue 3 + TypeScript + Tailwind CSS; see [Technical planning](technical-planning.md)). It was compiled on October 3, 2026 from the design canvas and updated after the last design pass (81 screens; see the [screen inventory](ui-design.md#screen-inventory)).

It lists **what** to build and where each piece is used. The canvas page **UI components** shows them visually. Library choices are recorded in [Decisions](#decisions). Folder structure, naming and the testing approach are not decided yet.

## How the components are layered

1. **Design tokens:** the Tailwind theme (colors, type, radius, spacing, control sizes). Every component uses these, not raw hex values.
2. **Primitives:** generic controls with no finance knowledge (Button, Input, Modal, Table…).
3. **Patterns:** combinations of primitives that recur across sections (FormField, Pagination, ScopeSelector, PreviewBox…).
4. **Domain components:** finance-specific pieces built from the above (MoneyInput, CategorySelect, CalendarMonth, TransactionRow…).
5. **Layouts:** page shells (AppShell, SetupShell, MarketingShell).

Pages and modals should be assembled from layers 2–5 with little custom markup.

## 1. Design tokens (Tailwind theme)

Values taken from the canvas. Define them once in the Tailwind config (or CSS `@theme`) as named tokens.

| Token group | Values in the design | Suggested names |
| --- | --- | --- |
| Font | IBM Plex Sans 400/500/600/700; tabular numbers for amounts | `font-sans`, utility `tabular-nums` on all money |
| Ink and text | #14171C primary, #3B4350 secondary, #5B6472 muted, #A3ABB8 disabled | `ink`, `ink-2`, `ink-muted`, `ink-disabled` |
| Surfaces | #FFFFFF card, #F6F7F9 page ground, #FAFBFC subtle, #F3F6FB selected row, #8E949C modal scrim | `surface`, `ground`, `subtle`, `selected`, `scrim` |
| Borders | #E3E6EB default, #EEF0F3 divider, #D5DAE1 control, #C9CFD8 input | `line`, `line-soft`, `line-control`, `line-input` |
| Income / info | #1E4A8F text on #E6EEFA; link #1D4ED8 | `info`, `info-soft`, `link` |
| Overdue / warning / destructive | #9A3412 text on #FFEDD5; #C2410C strong (badges, bars) | `warn`, `warn-soft`, `warn-strong` |
| Type scale | 11, 12, 13, 14 (body), 15, 17 (section), 21 (modal title), 26 (page title), 34/48 (marketing) | `text-2xs` … `text-display` |
| Radius | 4 (chips), 6 (controls; most common), 8 (cards), 10 (modals), full (pills, avatars) | `rounded-sm/md/lg/xl/full` |
| Control heights | 40 (default), 36 (compact), 32 (small/pagination), 44–48 (marketing and sign-in) | `h-control`, `h-control-sm`, `h-control-xs` |
| Shadows | Modal `0 16px 48px rgba(20,23,28,.24)`; segmented thumb `0 1px 2px rgba(20,23,28,.08)` | `shadow-modal`, `shadow-thumb` |

Rule from the design: states never rely on color alone. Overdue, Over target, Pending and similar states always carry a text label or icon.

## 2. Primitives

| Component | Variants and key props | Used in |
| --- | --- | --- |
| **Button** | `primary` (ink), `secondary` (outlined), `danger` (orange fill, for destructive confirms), `link-danger` (text, e.g. "Delete…", "Remove target…"), `ghost`; sizes 40/36/32; `icon` slot; `loading`; renders `<a>` (Inertia `Link`) or `<button>` | Every screen |
| **IconButton** | Square 36–40, required `aria-label` (close ×, dismiss, chevrons) | Modals, notifications, pagination, month switchers |
| **Icon** | One inline-SVG set at 1.75 stroke (calendar, bell, info, lock, warning, chevrons, plus, search, close, check) | Everywhere |
| **TextInput** | Text, email, search (with leading icon); `invalid` state; prefix/suffix slots | Forms, search boxes |
| **Textarea** | Auto-height optional | Notes on account, transaction and member forms |
| **Select** | Native select styled to tokens; supports `optgroup` | Assignee, timezone, reminder time, rows-per-page |
| **Checkbox** | Label plus optional hint; disabled with reason | Account lists, reminder recipients, Show hidden, Show paid bills |
| **Radio** and **RadioCard** | RadioCard is a bordered option with title and description, bold border when selected | Scope choices, sign-in method, category type, loan starting point |
| **ChoiceChips** | Single-select row of pill buttons (`role="radiogroup"`) | Repeats (One time / Weekly / … / Yearly) |
| **SegmentedControl** | Gray track with white selected thumb (`role="tablist"`) | All/Unread/Dismissed; Expense/Income/Transfers; chart type tabs; Amount/Usage % |
| **RangeTabs** | Compact dark-selected tabs | 1M/3M/6M/YTD/1Y/ALL on charts |
| **Badge / Pill** | `neutral`, `info`, `warn`, `outline`, `dashed` (Pending), with optional icon | Overdue, Paid, Pending, Refund, Built-in, Owner, Current month, Over by $X, Now overdue |
| **Avatar** | Initials, two color schemes; sizes 32/40/52 | Top bar, members, profile, setup |
| **Card / Panel** | White, 1px border, radius 8; optional header row with title and actions; optional footer | Nearly every page section |
| **Divider** | Plain line, or line with centered "or" | Setup |
| **Alert / Callout** | `info` (blue), `warning` (orange), `neutral` (gray), `lock`; `role="note"` or `"alert"`; icon plus rich text | Lock notices, removal notice, sign-in error, cancellation consequences, invite rules |
| **Modal (Dialog)** | Header (title, subtitle, close), scrollable body, footer (left slot for hint or destructive link, right slot for actions); sizes 520/560/600/640/800/920; our own focus trap, focus return, scroll lock, Esc and backdrop close with unsaved-change guard | 25 modals |
| **ConfirmDialog** | Modal preset for destructive actions: consequences list plus danger button | Remove member, Delete category, Remove target, Cancel subscription, Delete… |
| **DropdownMenu** | Button that opens a menu (`aria-haspopup="menu"`); arrow keys, Home/End, type-ahead, Esc, outside click | "Add manual account" (Cash, Checking, Savings, Credit card) |
| **Combobox** | Searchable single-select listbox: text filter, grouped options, disabled options with reason, keyboard navigation, `aria-activedescendant`; base for CategorySelect | Category pickers |
| **Popover** | Positioned floating panel, closes on Esc and outside click; shared by DropdownMenu, Combobox, DatePicker and Tooltip | Several |
| **Tooltip** | For disabled controls and chart points | Disabled Accept, Attached buttons, chart hover |
| **ProgressBar / Meter** | Value/max, `normal` and `over` colors, `aria-label` text | Card usage, loan repaid %, Budget category bars |
| **DescriptionList** | Two-column `dl` grid in a subtle box | Account facts, edit-modal context, payment details |
| **EmptyState** | Icon, title, text, optional action | No invitations, no transactions this month, no suggestions |
| **Skeleton / Spinner** | Placeholders shaped like the content, shown after 300 ms; spinner for in-place refreshes and working buttons; no shimmer with reduced motion | Page loads, Inertia partial reloads, buttons |
| **Toast** | Dark for success/progress, white with orange edge for errors; bottom-right, max three; success auto-hides after 5 s; optional Undo | Saves, sync, reversible actions |

## 3. Patterns

| Component | Purpose | Used in |
| --- | --- | --- |
| **FormField** | Label, control, hint, error; adds "Optional" next to the label when `optional` | All forms |
| **FormSection (Fieldset)** | Bordered group with legend ("Basics", "Schedule", "Reminders"…) | Bill, income, subscription, loan and card forms |
| **RequiredNote** | "All fields are required unless marked Optional." in modal footers | All create/edit modals |
| **PreviewBox** | Gray box with uppercase caption ("Upcoming dates", "After saving", "After this payment", "Preview") and lines or chips | 11 forms |
| **ScopeSelector** | RadioCards for *This occurrence only / This and all future* (bills, income, subscriptions) and *This month only / This and all future months* (Budget targets) | Edit bill, Edit subscription, Edit/Remove target |
| **DataTable** | Header, sortable columns optional, row slot, selectable row (highlight plus left bar), sticky footer total; horizontal-scroll wrapper when columns don't fit | Transactions, Bills & Income, Loans and Subscriptions payments, Account detail, Budget, Categories |
| **Pagination** | "Showing X–Y of N", prev/next, page numbers with gaps, rows-per-page 10/25/50 (never "Load more"; see [UI design](ui-design.md#scope-and-conventions)) | All long tables and lists |
| **TreeTable** | DataTable with expandable parent rows and indented children, plus Expand all / Collapse all | Categories |
| **ListRow** | Leading icon or avatar, title, meta line, trailing actions | Notifications, invitations, members, connections, attached transactions |
| **SidePanel** | Detail panel next to a table for the selected row | Transactions, Budget |
| **PageHeader** | Title, optional subtitle, right-side actions | Every app page |
| **FilterBar** | One row with search, selects and toggles above a table | Transactions, Bills & Income, Account detail |
| **StatTile** | Label, big tabular number, caption, optional badge | Home summary, Budget summary, Loans and Subscriptions summaries |
| **PrevNextSwitcher** | Chevrons around a label; used for month and occurrence switching | Home calendar, Budget month, Manage payment switcher |
| **SearchResultsList** | Search input plus result rows with Attach / disabled Attached | Manage payment "Find a transaction" |

## 4. Domain components

| Component | Notes | Used in |
| --- | --- | --- |
| **Money** (display) | Formats USD with sign rules: "−$64.12" outflow, "+$3,800.00" inflow in info color, owed amounts positive with "owed", signed Remaining; always tabular | Everywhere amounts appear |
| **MoneyInput** | Decimal input, USD formatting on blur, nonnegative option | 14 forms |
| **DatePicker** | Our own implementation: text input that accepts typed dates plus a Popover calendar (Monday-first, like Home), today marker, min/max and disabled dates, keyboard navigation. Also a day-of-month input for card statement and due days | Schedules, payments, limits, import dates |
| **CategorySelect** | Searchable Combobox. Typing matches categories and subcategories; results are grouped "Parent › Subcategory" options, filtered by type (expense/income), optional "No category"/"Uncategorized", top-level-only mode for parent pickers and Budget targets, disabled options with reason | Bills, income, subscriptions, transactions, category modals, Budget |
| **AccountMultiSelect** | Checkbox grid of household accounts (all account types) with an explanatory hint | Paying/receiving accounts on bills, income, subscriptions, loans, extra payments |
| **AssigneeSelect** | "Entire household" plus members | Bills, income, subscriptions, loans, accounts |
| **ReminderRecipients** | Checkbox per member with their reminder time; disabled no-login members with an invite hint | Bills, subscriptions, loans |
| **RecurrenceFields** | Repeats ChoiceChips, first date, optional end date, explanation text, UpcomingDates preview | New/Edit bill, income, subscription, loan |
| **UpcomingDates** | Date chips inside PreviewBox | Recurrence forms |
| **CalendarMonth** | Monday-first grid, today marker, per-day items, "N paid hidden" note, week totals | Home |
| **CalendarItem** | Chip styled by kind: bill, income, overdue, paid (struck through); clickable to open Manage | Home calendar and week list |
| **WeekList** | "Items by week" grouped by week and then by day | Home |
| **ManagePaymentPanel** | This payment (amount, date, Mark as paid), attached transactions, suggestions (top five, no pagination), Find a transaction | Manage bill/income modal |
| **TransactionRow** | Payee, Pending/Refund badges, date · account · "Parent › Subcategory", signed amount, attachment link | Transactions, Account detail, Budget panel, Manage modal |
| **SuggestionList** | Top five matches with Attach; empty state "No other matching transactions" | Manage modal, Mark paid modals |
| **AccountGroup** | Group header with total and combined usage, account rows with UsageMeter, connection meta and error line | Accounts |
| **UsageMeter** | ProgressBar plus label: card "% of limit", loan "% repaid · $X of $Y", none for balance-only | Accounts, Account detail |
| **ConnectionStatus** | Status pill, last success, latest error, import start date, Sync/Manage actions | Account detail, Household |
| **TimeSeriesChart** | Chart.js (through vue-chartjs) line/area component with ranges, hover crosshair and tooltip, Today marker, dashed projected segment, event markers (limit changes), Amount/Usage % mode | Accounts, Account detail, Loans |
| **BarChart** | Chart.js (through vue-chartjs) bar component: monthly bars with a dashed "scheduled" bar and hover tooltip | Subscriptions |
| **ChartLegend / ChartTable** | Legend for multi-series charts and a table alternative for accessibility | All charts |
| **Chart base** | Shared Chart.js setup used with the vue-chartjs wrapper: registers only the needed controllers, applies tokens (font, colors, grid), a crosshair/marker plugin, tooltip formatting through Money, and resize/destroy handling in Vue | All charts |
| **BudgetCategoryRow** | Category, count, progress bar, Spent/Target/Remaining/Over target with signed values and No target dashes | Budget |
| **NotificationItem** | Unread dot, kind icon, title with current-status badge, meta, timestamp, dismiss | Notifications |
| **InvitationCard** | Household, inviter, date, member count, "join as"; Decline and Review/Accept, disabled Accept with reason | Setup, Profile |
| **MemberRow** | Avatar, nickname, linked email or "No login", Owner badge, Edit/Remove | Household, Join review |
| **GoogleSignInButton** | Google mark plus label; full-width and inline sizes | Sign in, landing page |
| **SetupChecklist** | Shared first-run steps with progress, per-step actions and Hide | First-run Home |
| **DayOverflow** | "+N more" button and popover listing every item due that day with totals | Home calendar |
| **ChangeHistoryList** | Actor, timestamp, field old → new values; bank/system actors labeled; deleted references as placeholders | Change history modal for every record |
| **AttachmentList** | Attached transactions with Detach, collapsed hidden ones behind Show hidden, deleted placeholders | Manage payment modals |
| **ImportDateList** | Accounts in a connection with balance and an import-from date each | Connect a bank, Connection details |
| **HoldingsTable** | Holdings and trading activity tables (proposal) | Investments |

## 5. Layouts

| Layout | Contents | Used for |
| --- | --- | --- |
| **AppShell** | **TopBar** (logo/app name → Home, notifications bell with unread count, account chip → Profile, Sign out) + **SideNav** (household card; five sections with icons — Home, Bills & Income, Accounts, Budget, Household — whose sub-pages show only for the current section) + main content area (max width ~820–1120 depending on page) | All signed-in pages |
| **SetupShell** | TopBar in setup mode (no bell or Profile link) + centered column | Household setup, Join, Create household |
| **AuthLayout** | Two columns: dark product summary + sign-in card | Sign in, Sign-in error |
| **MarketingShell** | Sticky header with anchor nav, Sign in / Get started, sections, footer | Landing page |


## Suggested build order

1. Tokens, Icon, Button, IconButton, Badge, Card, Alert.
2. Form controls: TextInput, Textarea, Select, Checkbox, Radio/RadioCard, ChoiceChips, SegmentedControl, FormField, FormSection, MoneyInput, DateInput.
3. Popover, Modal, ConfirmDialog, DropdownMenu, Combobox, DatePicker, Toast.
4. DataTable, Pagination, ListRow, EmptyState, SidePanel, StatTile, PrevNextSwitcher.
5. AppShell (TopBar, SideNav), SetupShell, AuthLayout.
6. Domain inputs: CategorySelect, AccountMultiSelect, AssigneeSelect, ReminderRecipients, RecurrenceFields, ScopeSelector, PreviewBox.
7. Domain displays: Money, TransactionRow, CalendarMonth/CalendarItem/WeekList, UsageMeter, BudgetCategoryRow, NotificationItem, InvitationCard, MemberRow, ConnectionStatus.
8. Charts: Chart base (Chart.js + vue-chartjs), TimeSeriesChart, BarChart, legends and table alternatives.
9. MarketingShell and landing sections.

## Decisions

Approved by the user on October 3, 2026:

| Topic | Decision | Consequence for the library |
| --- | --- | --- |
| Headless UI library | **Build our own**; no headless component library | Modal, Popover, DropdownMenu, Combobox, Tabs/SegmentedControl and Tooltip implement focus management, keyboard support and ARIA themselves. Each needs keyboard and screen-reader tests. |
| Category picker | **Searchable** | CategorySelect is a Combobox with search over categories and subcategories, not a native select. |
| Date picker | **Our own implementation** | DatePicker is built in-house on Popover, Monday-first, with typed-date entry. |
| Charts | **Chart.js through the vue-chartjs wrapper** | TimeSeriesChart and BarChart use vue-chartjs components over Chart.js. The design's hover crosshair, Today marker, dashed projections and limit-change markers need Chart.js options or a small custom plugin. |
| Component catalog | **None.** Storybook was chosen, then dropped the same day | No separate catalog tool. The design canvas has a **UI components** page (Foundations, Buttons and forms, Feedback and overlays, Data display and layout, Finance components) showing each component's variants and states; it is the visual reference for building them. Component tests cover behavior; how to document components in code is open. |

## Open questions

1. How should components be documented and their states checked without a catalog tool (for example a hidden internal page, README per component, or tests only)?

# Household finance app — project documentation

This documentation records the planning conversation through October 3, 2026: the approved requirements, the design, revisions to earlier decisions, and the questions still open. It does not authorize implementation.

The project is a household finance web app inspired by Honeydue, particularly its calendar of upcoming household bills. The user requires planning before implementation and approval of every planning decision.

## Documentation map

| Document | Contents |
| --- | --- |
| [Product requirements](product-requirements.md) | Purpose, scope, navigation, categories, Budget, notifications and settings |
| [Households and permissions](households-and-permissions.md) | Google sign-in, household setup, members, invitations, ownership and access |
| [Schedules and calendar](schedules-and-calendar.md) | Bills, income, loans, subscriptions, recurrence, calendar, summaries and reminders |
| [Accounts and transactions](accounts-and-transactions.md) | Connections, accounts, balances, manual accounts, transactions and attachments |
| [UI design](ui-design.md) | The design canvas, conventions, every screen by section, and the 81 PNG exports in [docs/design](design/) |
| [Component library](component-library.md) | Tailwind tokens and the reusable Vue components to build, with library decisions |
| [Technical planning](technical-planning.md) | Approved stack and provider, research, and technical work still to decide |
| [Technical design](technical-design.md) | Full draft architecture, logical schema, financial algorithms, provider workflows, frontend contracts, operations, tests, delivery phases, and proposal review register |
| [Decision history](decision-history.md) | Significant changes and superseded decisions |
| [Open decisions](open-decisions.md) | Questions still open, including design proposals awaiting confirmation |

## How to read these documents

- **Approved:** explicitly selected or confirmed by the user. These rules appear in the requirement documents.
- **Designed:** shown on the design canvas and in the exports. Design details the user delegated to Claude are part of the design; choices that go beyond approved rules are listed as proposals in [Open decisions](open-decisions.md#design-proposals-awaiting-confirmation).
- **Open:** not yet decided; listed in [Open decisions](open-decisions.md).
- **Superseded:** replaced by a later instruction; [Decision history](decision-history.md) explains the change.
- **Research context:** provider information found during planning; not a guarantee of coverage, pricing or behavior.

An approval applies to the question it answered. Short replies such as "yes" do not approve unrelated features.

## Project snapshot

| Area | Approved direction |
| --- | --- |
| Platform | Web app usable on phones and desktops; the design is desktop only for now |
| Stack | Laravel, Inertia, Vue 3, TypeScript, Tailwind CSS, PostgreSQL, Redis; own component library, Chart.js via vue-chartjs |
| Authentication | Google only |
| Households | Multiple households; one active household per user; household setup (create or accept an invitation) is required before using the app |
| Records and access | Records belong to the household and stay there; every member can view, create, edit and delete them; member admin, invitations, ownership transfer and household deletion are owner-only |
| Navigation | Home; Bills & Income (Subscriptions); Accounts (Loans, Investments); Budget (Transactions); Household (Categories); Notifications and Profile from the top bar |
| Home | Month calendar with monthly and weekly summaries and a week/day list; clicking an item opens its Manage modal |
| Accounts | Cash, Investments, Credit cards and Loans groups with totals; net worth and balance history chart; card usage and loan repayment progress; bank connections are managed on Household |
| Budget | Monthly spending by expense category from actual transactions, with optional monthly USD targets on top-level categories, signed Remaining, UTC month locks, and one over-target alert per category per month |
| Categories | Household-owned, seeded with defaults including subcategories; one level of subcategories; built-in Transfers Between Accounts and Loan Payments |
| Connections | Lunch Flow Platform API; hourly sync and Sync now for every member; partial syncs keep successful updates |
| Currency | USD only |
| Reminders | In-app, on the due date, at each recipient's reminder time |
| Design | Canvas "Household Finance UI" with 81 screens exported to docs/design |
| Implementation status | Planning only; no application code |
| Technical design status | Full draft prepared for review; new technical choices and open-rule resolutions remain proposals |

## Planning boundary

Honeydue is a reference, not approval of every Honeydue feature. Expense splitting, household chat, enforced spending limits, money movement and other unconfirmed features are not approved. Architecture, database schema, hosting, exact versions, milestones and release criteria still require review. Concrete proposals are in the [Technical design review register](technical-design.md#22-review-register); unresolved product questions remain in [Open decisions](open-decisions.md).

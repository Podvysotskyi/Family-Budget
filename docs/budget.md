# Budget

The budget page shows a selected household or user budget period, income, budget categories, and a summary.

## Categories

Households receive default categories:

- Subscriptions
- Bills
- Investment / Savings
- Credit Cards
- Other

The backend stores the category summary default on `budget_categories.in_summary` and returns it to the Nuxt app as `includeInSummary`.

Default summary behavior:

- Subscriptions, Bills, Other, and custom categories are included.
- Investment / Savings and Credit Cards are excluded.

Categories with `in_summary=true` are always included in the budget summary and cannot be changed by the user. Categories with `in_summary=false` can be included or excluded from the budget page for the current frontend session only; the switch does not update the API or database.

Existing households may not have database rows for Investment / Savings or Credit Cards. When either row is missing, the frontend adds a synthetic category so goal and credit-card budget items still have a category card. These synthetic categories are not sent to the API and cannot be reordered from settings; their summary switch is also frontend-only.

Custom categories come from the API and default to included in the summary.

## Summary

The budget summary uses:

- income entries for the selected budget period
- subscription totals when the Subscriptions category is included
- credit-card totals when the Credit Cards category is included
- goal totals when the Investment / Savings category is included

Category cards still show their items and totals when excluded from the summary. Exclusion only affects summary expense and ending-balance calculations.

## Credit Cards

Budget credit-card items are loaded from `GET /user/:id/credit-cards/budget`.

The budget card shows credit-card due occurrences in the selected period. The amount is the balance effective on the occurrence date. Credit-card amounts are excluded from the summary by default and count only when the Credit Cards category is included.

## Goals

Budget goal items are loaded from `GET /user/:id/goals/budget`.

Only goals with `include_in_budget=true` are shown. The card shows active goals for the selected period using the current target amount. Goal amounts are excluded from the summary by default and count only when the Investment / Savings category is included.

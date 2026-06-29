---
name: nuxt-pages
description: Create and refactor Family-Budget Nuxt 4 pages in apps/web/app/pages using the project’s route selection, store loading, page-level fetch, and component composition patterns. Use when changing page files, replacing page shells, wiring page refresh flows, or moving logic between pages and reusable components.
---

# Nuxt Pages

Use this skill when working in `apps/web/app/pages`.

## Page Responsibilities

- Pages own route params, selected list identity, and the actual fetch/refresh function for the visible page data.
- Pages compose header/list components and pass the minimum props needed for selection and rendering.
- Pages should avoid owning modal refs for row or header actions when a child component owns the launcher.
- Pages should listen for child `refresh` events and call the correct explicit store fetch action.

## Data Loading

- Use explicit store actions for the active data set, such as `fetchHouseholdItems(...)` or `fetchUserItems(...)`.
- Do not call broad fetch actions when the page represents one ownership mode.
- If a page needs prerequisite state such as household id, load it through the focused store that owns that domain.
- Keep loading state derived from the stores the page actually uses.

## Structure

- Use `definePageMeta` for middleware/layout.
- Prefer direct page composition over shell components when the shell adds indirection without reuse.
- Keep route-specific behavior in the page; move reusable presentation and action controls into components.
- Use computed route params when the route can change without recreating the component, then watch them with `{ immediate: true }`.

## Refresh Flow

- Mutation stores should not refresh lists implicitly.
- Modal components emit `created`/`saved`; their owning component may emit `refresh`; the page handles `refresh` by fetching the active list.
- Create flows usually live in page headers. Row edit/update/cancel flows usually live in list items.

## Verification

- Run `pnpm nx run web:typecheck --skip-nx-cache` after page, route-param, or page/component contract changes.

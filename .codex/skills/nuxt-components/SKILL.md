---
name: nuxt-components
description: Create and refactor Family-Budget Nuxt 4 Vue components in apps/web/app/components using the project’s component ownership, event, type, and verification patterns. Use when extracting reusable components, moving logic between page/header/list/list-item components, or wiring component-owned modals and refresh events.
---

# Nuxt Components

Use this skill when creating or refactoring Vue components in `apps/web/app/components`.

## Component Shape

- Use `<script setup lang="ts">` and `defineOptions({ name: 'ComponentName' })`.
- Type props and emits with `defineProps` and `defineEmits`.
- Type every `ref<T>()` and `computed<T>()`, including template refs.
- Keep component state local when it only affects that component, such as switches, selected modal item, and form state.
- Import reusable domain/form/API types from `~/types/...`; do not define shared contracts in component files.

## Ownership

- Put logic at the smallest component that naturally owns the interaction.
- Header components should own header controls and their modal refs. Emit `refresh` after successful modal-created work.
- List components should own list-only UI state such as “active only” filters and render list items.
- List item components should own row action launchers and row action modals. Emit `refresh` after successful modal-saved work.
- Pages should not hold row modal refs when the list item owns the row action.

## Events

- Emit domain-neutral parent events when bubbling across reusable boundaries, usually `refresh`.
- Keep modal event details local: translate `created` or `saved` into `refresh` at the component that owns the modal.
- Do not make child components fetch page data directly when the page owns the active route/list selection.

## Stores

- Use stores only when the component owns the interaction that needs them.
- Avoid broad legacy stores when a newer focused store exists, for example prefer `useHouseholdStore` over dashboard state for household members.
- Read store state through getters/computed values in components.

## UI

- Match the existing Nuxt UI style and component density.
- Use icon-only buttons for compact row actions with clear `aria-label` values.
- Keep placeholders and loading skeletons inside the component that owns the missing/loading surface.

## Verification

- Run `pnpm nx run web:typecheck --skip-nx-cache` after component API, emit, modal ref, or type changes.

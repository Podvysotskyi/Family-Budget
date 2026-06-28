---
name: nuxt-app-types
description: Create and organize TypeScript types for the Family-Budget Nuxt app. Use when adding, moving, or refactoring app-level types in apps/web/app/types, including form data, submit events, API/store payloads, modal context types, domain models, select option types, and component-local type extraction.
---

# Nuxt App Types

## Overview

Keep reusable Nuxt app types in `apps/web/app/types/` and import them into components, stores, and composables with `~/types/...`. Prefer domain-specific type files over component-local declarations when a type describes feature data, form state, exposed modal context, store/API payloads, or a contract shared across files.

## Type Placement

- Put feature/domain types in the matching file under `apps/web/app/types/`, for example credit-card types in `apps/web/app/types/credit-cards.ts`.
- Create a new type file only when no existing domain file clearly owns the type.
- Keep component-local types only when they are purely presentational and not part of a domain, form, modal, store, or composable contract.
- Do not define reusable types in Pinia stores or large Vue components.
- Use exported types, not interfaces, unless an existing file consistently uses interfaces.

## Naming

- Name domain entities directly: `CreditCard`, `CreditCardLimit`, `Subscription`.
- Name store/API payloads by action and domain: `SaveCreditCardInput`, `CancelCreditCardInput`.
- Name UI form state separately from API payloads: `CreditCardFormData`, `CreditCardFormSubmitData`, `CreditCardFormSubmitEvent`.
- Name modal launch context explicitly when a modal is opened through exposed methods: `CreditCardCreateFormContext`, `CreditCardEditFormContext`.
- Name option types by domain when they are exported: `CreditCardAssignmentOption`, not a broad `SelectOption`, unless a shared app-wide option type already exists.

## Forms And Dates

- Use `Date | null` for Nuxt UI date picker form state in new or refactored forms.
- Use `number | null` for nullable numeric input state.
- Keep submit data non-null when Zod validation guarantees required values.
- Keep API/store payload types in API shape, usually date strings such as `YYYY-MM-DD`.
- Convert UI form dates to strings in the submit handler, not in the type definition.

## Refactoring Existing Types

- Move a component-local type to `apps/web/app/types/` when another file calls exposed component methods with that type, when it describes domain form state, or when it is part of a store/API boundary.
- Update imports to use `import type { ... } from '~/types/<domain>'`.
- Remove stale local type aliases after promotion.
- Keep the diff narrow: do not rename unrelated domain types during a placement cleanup.

## Verification

- Run `pnpm nx run web:typecheck` after adding, moving, renaming, or changing exported app types.
- If payload type changes affect the API contract, also run `pnpm nx run api:typecheck`.

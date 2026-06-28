---
name: nuxt-ui-forms
description: Implement and refactor forms in the Family-Budget Nuxt 4 app using the established Nuxt UI, Zod, Pinia, composable, and type-folder patterns. Use when creating or changing Vue form components, modal forms, UForm/UFormField validation, date picker form state, submit/save handlers, toast feedback, or store/API payload conversion in apps/web.
---

# Nuxt UI Forms

Use this skill when working on forms in `apps/web/app`. Match the pattern established by `CreditCardBalanceModal.vue`: keep form state local, validate with `UForm` + Zod, keep API payload conversion at the submit boundary, and use shared composables for dates and toasts.

## Core Pattern

- Use `UForm` with `:schema` and `:state`; do not manually map Zod errors into `UFormField`.
- Use `UFormField` with `name` matching the schema key. Add `required` for required fields.
- Keep the submit button as `type="submit"` and point it at the form with `form="<form-id>"` when the button lives in a modal footer.
- Keep the save handler responsible for API/store calls. Do not emit raw save events to the parent unless the existing component contract requires it.
- Disable fields and submit while saving. Do not allow close while saving unless closing is part of a successful save flow.
- Show success and error feedback with `useAppToast()` helpers, not direct `useToast()` calls in components.

## State And Types

- Put reusable TypeScript declarations in `apps/web/app/types/`, not in Pinia stores or large components.
- Keep raw UI form state separate from API/store payload types.
- Use `Date | null` for date picker form state in new/refactored forms.
- Convert `Date` to `YYYY-MM-DD` strings only at the store/API boundary with `useDateUtils().formatDateToString`.
- Use `null` for empty required form fields when the input component needs an empty state; normalize `null` in the Zod schema so submit data remains non-null.
- For numeric `UInput`, store numbers in form state and use Nuxt UI's nullable model modifier for empty values:

```vue
<UInput
  v-model.nullable="formData.amount"
  type="number"
/>
```

## Zod Schema

- Keep schema close to the form component unless multiple components share the exact schema.
- Prefer direct Zod constraints over `superRefine` when possible:

```ts
const minDate = computed(() => selectedItem.value ? parseDateString(selectedItem.value.startDate) || getToday() : getToday())
const formSchema = computed(() => z.object({
  date: z.preprocess(
    value => value === null ? undefined : value,
    z.date('Date is required.').min(minDate.value, 'Date must be on or after the start date.')
  ),
  amount: z.preprocess(
    value => value === null ? undefined : value,
    z.number('Amount is required.').min(0, 'Amount must be zero or greater.')
  )
}))
```

- Use `superRefine` only for validation that cannot be expressed by field constraints.
- Keep UI constraints and schema constraints aligned. Example: if `AppDatePicker` has `:min`, the schema should normally enforce the same minimum.

## Modals

- Let modal form components own `open` state when they expose `open(...)` and `close(...)`.
- Require the domain object in `open(item)` when the form depends on it.
- Avoid validation messages for impossible states, such as “item is required” when `open(item)` is the only way to show the modal.
- Use `:dismissible="false"` when outside-click close should be blocked.
- Use `:close="false"` when the modal header X should be hidden.
- Implement guarded close when saving:

```ts
function close(force = false) {
  if (isSaving.value && !force) {
    return
  }

  isOpen.value = false
  selectedItem.value = null
  resetForm()
}
```

- After a successful save, call `close(true)` if normal close is blocked during save.

## Dates

- Use `useDateUtils()` for date helpers:
  - `getToday()`
  - `getTodayDateString()`
  - `parseDateString(value)`
  - `formatDateToString(date)`
- Use `AppDatePicker` for date fields.
- Prefer `Date | null` form state in new/refactored forms; preserve legacy string callers only when changing them would broaden scope.

## Store And API Boundary

- Pinia stores should contain state/actions and import types from `apps/web/app/types`.
- Store inputs should match API shape, not UI form shape.
- In submit handlers, create an explicitly typed store input before calling the store:

```ts
const input: SaveThingInput = {
  date: formatDateToString(event.data.date),
  amount: event.data.amount
}

await thingsStore.saveThing(id, input)
```

## Verification

- Run `pnpm nx run web:typecheck` after changing form components, shared date picker behavior, composables, or app types.
- If the change affects API payload shape or backend validation, also run `pnpm nx run api:typecheck`.

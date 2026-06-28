---
name: nuxt-ui-modals
description: Implement and refactor modal components in the Family-Budget Nuxt 4 app using the established Nuxt UI modal pattern. Use when creating or changing Vue modal components, exposed open/close APIs, parent modal refs, modal save flows, blocked close behavior, hidden close buttons, dismissible settings, footer submit buttons, or modal-owned API/store actions in apps/web.
---

# Nuxt UI Modals

Use this skill when working on modal components in `apps/web/app`. Match the pattern established by `CreditCardBalanceModal.vue`: modal components own their open state when appropriate, expose explicit methods to parents, guard close behavior while saving, and keep save behavior inside the modal when the modal owns the form.

## Ownership

- Let a modal own `isOpen` when the parent only needs to launch it.
- Expose `open(...)` and `close(...)` with `defineExpose`.
- Pass required domain context into `open(item)`, not through many parent-owned props.
- Keep the selected domain object in a local ref, for example `selectedCreditCard`.
- Do not show or validate impossible missing-context states when `open(item)` is the only path to display the modal.

```ts
const isOpen = ref(false)
const selectedItem = ref<Item | null>(null)

function open(item: Item) {
  selectedItem.value = item
  resetForm(item)
  isOpen.value = true
}

defineExpose({
  close,
  open
})
```

## Parent Usage

- Use a template ref to open modal-owned flows.
- Keep parent state limited to list/page state and selected action triggers.
- Do not duplicate modal form state in the parent.

```ts
const itemModal = ref<InstanceType<typeof ItemModal> | null>(null)

function startEditingItem(item: Item) {
  itemModal.value?.open(item)
}
```

```vue
<ItemModal ref="itemModal" />
```

## Closing

- Implement a single `close(force = false)` function.
- Block user-triggered close while saving.
- Use `close(true)` after successful save if normal close is blocked during saving.
- Reset selected item and form state inside `close`.

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

## UModal Props

- Use `:dismissible="false"` when outside-click and Escape close should be blocked.
- Use `:close="false"` when the header X button should be hidden.
- Keep `@update:open` wired to close only on false updates:

```vue
<UModal
  :open="isOpen"
  title="Edit item"
  :close="false"
  :dismissible="false"
  @update:open="(value: boolean) => !value && close()"
>
```

## Save Flow

- Keep the save handler inside the modal when the modal owns the form.
- Use `isSaving` to disable fields, cancel buttons, and submit buttons.
- Convert UI form data into store/API payloads inside `save`.
- Use `useAppToast()` for success and error feedback.
- Close with `close(true)` after successful persistence.

```ts
async function save(event: SubmitEvent) {
  if (!selectedItem.value) {
    return
  }

  isSaving.value = true

  try {
    await store.saveItem(selectedItem.value.id, event.data)
    addSuccessToast('Item saved.')
    close(true)
  } catch {
    addErrorToast('Item could not be saved.')
  } finally {
    isSaving.value = false
  }
}
```

## Footer Actions

- Put primary and cancel actions in the `#footer` slot.
- If the submit button lives in the footer and the form is in the body, set `type="submit"` and `form="<form-id>"`.
- Do not call submit handlers with `@click` when using `UForm`; let the form submit event provide validated data.
- Use explicit `@click="close()"` for cancel buttons so click events are not passed as close arguments.

```vue
<template #footer>
  <div class="flex w-full justify-end gap-2">
    <UButton
      color="neutral"
      variant="ghost"
      label="Cancel"
      :disabled="isSaving"
      @click="close()"
    />
    <UButton
      color="primary"
      label="Save"
      type="submit"
      form="item-form"
      :disabled="!canSubmit"
      :loading="isSaving"
    />
  </div>
</template>
```

## Coordination With Form Skill

- When a modal contains a form, also follow `$nuxt-ui-forms`.
- Keep modal behavior in this skill and form validation/data-shaping behavior in `$nuxt-ui-forms`.

## Verification

- Run `pnpm nx run web:typecheck` after changing modal component APIs, refs, exposed methods, or modal form wiring.

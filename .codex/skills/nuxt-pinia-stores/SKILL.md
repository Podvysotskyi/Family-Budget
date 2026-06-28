---
name: nuxt-pinia-stores
description: Create and refactor Pinia stores in the Family-Budget Nuxt 4 app using the established storeApiFetch, type-folder, getter/action, abort-controller, and toast-feedback patterns. Use when adding or changing stores in apps/web/app/stores, store-backed API calls, list loading state, cancellation behavior, store getters, or component refresh flows.
---

# Nuxt Pinia Stores

Use this skill when working on Pinia stores in `apps/web/app/stores`. Match the pattern established by `credit-cards.ts`: stores own fetched domain state and API actions, expose read-only derived access through getters, use `storeApiFetch`, keep reusable types in `apps/web/app/types`, and surface user-facing errors with `useAppToast`.

## Store Shape

- Use option stores with `defineStore('<domain>', { state, getters, actions })`.
- Keep state serializable except when a scoped request helper is intentionally stored, such as `abortController: null as AbortController | null` for cancellable list loads.
- Use arrays for a single active household collection when the app can only operate on one household at a time.
- Use keyed records for user-specific collections:

```ts
state: () => ({
  abortController: null as AbortController | null,
  householdItems: [] as Item[],
  loading: false,
  userItems: {} as Record<string, Item[]>
})
```

## Getters

- Put read-only accessors in `getters`, not `actions`.
- Return collection getters as properties when no argument is needed.
- Return a function from the getter when an argument is needed.
- Add explicit household/user state predicates as getters. Avoid broad aggregate predicates when the component renders one selected list at a time.

```ts
getters: {
  householdItemList: state => state.householdItems,

  userItemList: state => (userId: string) => {
    return state.userItems[userId] || []
  },

  hasHouseholdItems: state => state.householdItems.length > 0,

  hasUserItems: state => (userId: string) => {
    return Boolean(state.userItems[userId]?.length)
  },

  isLoading: state => state.loading
}
```

## Actions

- Use actions for API calls and mutations only.
- Keep list fetch actions explicit. Prefer `fetchHouseholdItems(id)` and `fetchUserItems(id)` over one combined fetch when the API has separate household/user endpoints.
- Keep mutation actions focused on one API request. Do not make create/update/cancel/save actions refresh list state implicitly; parent components should refresh from modal events or explicit flow events.
- Use `storeApiFetch`, not direct `$fetch`, inside stores.
- Import store payload and domain types from `~/types/...`.

```ts
async updateItem(itemId: string, input: SaveItemInput) {
  await storeApiFetch(`/items/${itemId}`, {
    method: 'PATCH',
    body: input
  })
}
```

## Loading And Cancellation

- For list fetches that can be superseded by route/filter changes, use `useAbortController()`.
- Before starting a new list request, create a fresh controller with `createAbortController(this)`; this aborts the previous stored controller.
- Pass `signal: abortController.signal` to `storeApiFetch`.
- Clear the target list before fetching when the selected list changed and stale rows should not remain visible.
- Set `abortController` to `null` after a successful response.
- In `finally`, set `loading = false` only if the request was not aborted; an aborted request may have been replaced by a newer in-flight request.
- In `catch`, suppress toast feedback when the request was aborted.

```ts
const abortController = createAbortController(this)
this.loading = true
this.householdItems = []

try {
  const response = await storeApiFetch<{ items: Item[] }>(`/households/${householdId}/items`, {
    signal: abortController.signal
  })

  this.householdItems = response.items
  this.abortController = null
} catch {
  if (!abortController.signal.aborted) {
    addErrorToast('Items could not be loaded')
  }
} finally {
  if (!abortController.signal.aborted) {
    this.loading = false
  }
}
```

## Error Feedback

- Do not store user-facing error strings in Pinia state for normal load failures.
- Use `useAppToast()` for user-facing API errors:

```ts
const { addErrorToast } = useAppToast()
```

- Keep toast messages domain-specific and concise.
- For abortable requests, only show the error toast if `!abortController.signal.aborted`.

## Component Coordination

- Components should read store getters through computed refs.
- Components should call explicit fetch actions for the active list only.
- Parent components should refresh list data after modal `created` or `saved` events.
- Keep route/filter selection in the component unless multiple components need the exact same selection state.

## Types

- Follow `$nuxt-app-types` when adding or moving store/domain payload types.
- Store action inputs should match API payload shape, not UI form state.
- Avoid defining reusable domain, modal, form, or API payload types inside store files.

## Verification

- Run `pnpm nx run web:typecheck --skip-nx-cache` after changing Pinia stores, composables used by stores, store types, or store consumers.
- If store endpoint changes require API routes or DTO/service updates, also run `pnpm nx run api:typecheck --skip-nx-cache`.

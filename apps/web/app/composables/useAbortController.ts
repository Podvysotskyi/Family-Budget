export function useAbortController() {
  function createAbortController(store: { abortController: AbortController | null }) {
    if (store.abortController) {
      store.abortController.abort()
    }

    const abortController = new AbortController()
    store.abortController = abortController

    return abortController
  }

  return {
    createAbortController
  }
}

import { describe, expect, it, vi } from 'vitest'
import { useAbortController } from '../../app/composables/useAbortController'

describe('useAbortController', () => {
  it('assigns a new controller to an empty store', () => {
    const store: { abortController: AbortController | null } = {
      abortController: null
    }
    const { createAbortController } = useAbortController()

    const controller = createAbortController(store)

    expect(store.abortController).toBe(controller)
    expect(controller.signal.aborted).toBe(false)
  })

  it('aborts the previous request before replacing its controller', () => {
    const previous = new AbortController()
    const abort = vi.spyOn(previous, 'abort')
    const store = { abortController: previous }
    const { createAbortController } = useAbortController()

    const replacement = createAbortController(store)

    expect(abort).toHaveBeenCalledOnce()
    expect(previous.signal.aborted).toBe(true)
    expect(store.abortController).toBe(replacement)
  })
})

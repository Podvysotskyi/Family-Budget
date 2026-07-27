import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWaitUntil } from '../../app/composables/useWaitUntil'

describe('useWaitUntil', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves immediately when the condition is already true', async () => {
    const condition = vi.fn(() => true)
    const { waitUntil } = useWaitUntil()

    await waitUntil(condition)

    expect(condition).toHaveBeenCalledOnce()
  })

  it('polls until the condition becomes true', async () => {
    vi.useFakeTimers()
    const condition = vi.fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    const { waitUntil } = useWaitUntil()

    const waiting = waitUntil(condition, 25)
    await vi.advanceTimersByTimeAsync(50)
    await waiting

    expect(condition).toHaveBeenCalledTimes(3)
  })
})

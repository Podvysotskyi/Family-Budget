import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAppToast } from '../../app/composables/useAppToast'

describe('useAppToast', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs success messages during server rendering', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const { addSuccessToast } = useAppToast()

    addSuccessToast('Saved')

    expect(log).toHaveBeenCalledWith('Saved')
  })

  it('logs error messages during server rendering', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { addErrorToast } = useAppToast()

    addErrorToast('Failed')

    expect(error).toHaveBeenCalledWith('Failed')
  })
})

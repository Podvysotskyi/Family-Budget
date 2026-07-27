import { mockComponent, mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CreditCardCancelModal from '../../app/components/credit-cards/CreditCardCancelModal.vue'
import CreditCardCreateModal from '../../app/components/credit-cards/CreditCardCreateModal.vue'
import CreditCardEditModal from '../../app/components/credit-cards/CreditCardEditModal.vue'
import CreditCardUpdateBalanceModal from '../../app/components/credit-cards/CreditCardUpdateBalanceModal.vue'
import { useCreditCardsStore } from '../../app/stores/credit-cards'
import {
  exposedModal,
  resetModalHarness,
  seedHouseholdStore,
  submitForm,
  today,
  user
} from './support/modal-harness'

const toastMocks = vi.hoisted(() => ({
  addErrorToast: vi.fn(),
  addSuccessToast: vi.fn()
}))

mockNuxtImport('useAppToast', () => () => toastMocks)
mockComponent('UModal', async () => {
  const { defineComponent, h } = await import('vue')
  return defineComponent({
    name: 'UModal',
    setup(_, { slots }) {
      return () => h('div', [slots.default?.(), slots.body?.(), slots.footer?.()])
    }
  })
})
mockComponent('UForm', async () => {
  const { defineComponent, h } = await import('vue')
  return defineComponent({
    name: 'UForm',
    emits: ['submit'],
    setup(_, { slots }) {
      return () => h('form', slots.default?.())
    }
  })
})

const creditCard = {
  id: 'card-1',
  name: 'Rewards',
  user: null,
  startDate: '2026-01-01',
  endDate: null,
  dueDate: '2026-08-01',
  currentBalance: 100,
  currentLimit: 1000
}

describe('credit-card modal flows', () => {
  beforeEach(resetModalHarness)

  it('creates, edits, updates, and cancels credit cards', async () => {
    const createWrapper = await mountSuspended(CreditCardCreateModal)
    seedHouseholdStore()
    const store = useCreditCardsStore()
    const createUser = vi.spyOn(store, 'createUserCreditCard').mockResolvedValue(undefined)
    const createHousehold = vi.spyOn(store, 'createHouseholdCreditCard').mockResolvedValue(undefined)
    const update = vi.spyOn(store, 'updateCreditCard').mockResolvedValue(undefined)
    const updateBalance = vi.spyOn(store, 'updateCreditCardBalance').mockResolvedValue(undefined)
    const cancel = vi.spyOn(store, 'cancelCreditCard').mockResolvedValue(undefined)
    const createModal = exposedModal(createWrapper)

    createModal.open(user.id)
    await submitForm(createWrapper, {
      name: ' Rewards ',
      startDate: today,
      dueDate: today,
      limit: 1000,
      balance: 100
    })
    expect(createUser).toHaveBeenCalledWith(user.id, expect.objectContaining({ name: 'Rewards' }))
    createModal.open(null)
    await submitForm(createWrapper, {
      name: 'Household card',
      startDate: today,
      dueDate: today,
      limit: 2000,
      balance: 0
    })
    expect(createHousehold).toHaveBeenCalled()

    const editWrapper = await mountSuspended(CreditCardEditModal)
    exposedModal(editWrapper).open(creditCard)
    await submitForm(editWrapper, {
      name: ' Updated ',
      userId: 'household',
      dueDate: today,
      limit: 1500
    })
    expect(update).toHaveBeenCalledWith(creditCard.id, expect.objectContaining({
      name: 'Updated',
      userId: null
    }))

    const balanceWrapper = await mountSuspended(CreditCardUpdateBalanceModal)
    exposedModal(balanceWrapper).open(creditCard)
    await submitForm(balanceWrapper, { date: today, balance: 75 })
    expect(updateBalance).toHaveBeenCalledWith(creditCard.id, {
      date: '2026-07-26',
      balance: 75
    })

    const cancelWrapper = await mountSuspended(CreditCardCancelModal)
    const cancelModal = exposedModal(cancelWrapper)
    cancelModal.open(creditCard)
    await submitForm(cancelWrapper, { effectiveDate: today })
    expect(cancel).toHaveBeenCalledWith(creditCard.id, {
      effectiveDate: '2026-07-26'
    })
    cancelModal.open({ ...creditCard, endDate: '2026-07-01' })
  })

  it('reports persistence failures', async () => {
    const createWrapper = await mountSuspended(CreditCardCreateModal)
    seedHouseholdStore()
    const store = useCreditCardsStore()
    vi.spyOn(store, 'createUserCreditCard').mockRejectedValue(new Error('offline'))
    vi.spyOn(store, 'updateCreditCard').mockRejectedValue(new Error('offline'))
    vi.spyOn(store, 'updateCreditCardBalance').mockRejectedValue(new Error('offline'))
    vi.spyOn(store, 'cancelCreditCard').mockRejectedValue(new Error('offline'))
    exposedModal(createWrapper).open(user.id)
    await submitForm(createWrapper, {
      name: 'Card',
      startDate: today,
      dueDate: today,
      limit: 100,
      balance: 0
    })

    const editWrapper = await mountSuspended(CreditCardEditModal)
    exposedModal(editWrapper).open(creditCard)
    await submitForm(editWrapper, {
      name: 'Card',
      userId: user.id,
      dueDate: today,
      limit: 100
    })
    const balanceWrapper = await mountSuspended(CreditCardUpdateBalanceModal)
    exposedModal(balanceWrapper).open(creditCard)
    await submitForm(balanceWrapper, { date: today, balance: 0 })
    const cancelWrapper = await mountSuspended(CreditCardCancelModal)
    exposedModal(cancelWrapper).open(creditCard)
    await submitForm(cancelWrapper, { effectiveDate: today })

    expect(toastMocks.addErrorToast).toHaveBeenCalledWith('Credit card could not be created.')
    expect(toastMocks.addErrorToast).toHaveBeenCalledWith('Credit card could not be saved.')
    expect(toastMocks.addErrorToast).toHaveBeenCalledWith('Credit card balance could not be saved.')
    expect(toastMocks.addErrorToast).toHaveBeenCalledWith('Credit card could not be canceled.')
  })
})

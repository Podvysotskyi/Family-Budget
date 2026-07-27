import { mockComponent, mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SubscriptionCancellationModal from '../../app/components/subscriptions/SubscriptionCancellationModal.vue'
import SubscriptionCreateModal from '../../app/components/subscriptions/SubscriptionCreateModal.vue'
import SubscriptionEditModal from '../../app/components/subscriptions/SubscriptionEditModal.vue'
import { useSubscriptionsStore } from '../../app/stores/subscriptions'
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

const subscription = {
  id: 'subscription-1',
  name: 'Streaming',
  user: null,
  type: 'monthly' as const,
  startDate: '2026-01-15',
  endDate: null,
  nextChargeDate: '2026-08-15',
  amount: 20,
  autopay: true
}

describe('subscription modal flows', () => {
  beforeEach(resetModalHarness)

  it('creates subscriptions for users and households and reports failures', async () => {
    const wrapper = await mountSuspended(SubscriptionCreateModal)
    seedHouseholdStore()
    const store = useSubscriptionsStore()
    const createUser = vi.spyOn(store, 'createUserSubscription').mockResolvedValue(undefined)
    const createHousehold = vi.spyOn(store, 'createHouseholdSubscription').mockResolvedValue(undefined)
    const modal = exposedModal(wrapper)

    modal.open(user.id)
    await submitForm(wrapper, {
      name: ' Streaming ',
      userId: user.id,
      type: 'monthly',
      startDate: today,
      dueDate: today,
      endDate: null,
      amount: 20,
      autopay: true
    })
    expect(createUser).toHaveBeenCalledWith(user.id, expect.objectContaining({
      name: 'Streaming',
      startDate: '2026-07-26'
    }))
    expect(wrapper.emitted('created')).toHaveLength(1)

    modal.open(null)
    await submitForm(wrapper, {
      name: 'Household service',
      userId: 'household',
      type: 'yearly',
      startDate: today,
      dueDate: today,
      endDate: null,
      amount: 100,
      autopay: false
    })
    expect(createHousehold).toHaveBeenCalled()

    createUser.mockRejectedValueOnce(new Error('offline'))
    modal.open(user.id)
    await submitForm(wrapper, {
      name: 'Failure',
      userId: user.id,
      type: 'monthly',
      startDate: today,
      dueDate: today,
      endDate: null,
      amount: 5,
      autopay: false
    })
    expect(toastMocks.addErrorToast).toHaveBeenCalledWith('Subscription could not be created.')
    modal.close()
  })

  it('edits and cancels subscriptions while ignoring canceled records', async () => {
    const editWrapper = await mountSuspended(SubscriptionEditModal)
    const store = useSubscriptionsStore()
    const update = vi.spyOn(store, 'updateSubscription').mockResolvedValue(undefined)
    const cancel = vi.spyOn(store, 'cancelSubscription').mockResolvedValue(undefined)
    const editModal = exposedModal(editWrapper)

    editModal.open(subscription)
    await submitForm(editWrapper, {
      name: ' Updated ',
      userId: 'household',
      type: 'yearly',
      nextChargeDate: today,
      amount: 25,
      autopay: false
    })
    expect(update).toHaveBeenCalledWith(subscription.id, expect.objectContaining({
      name: 'Updated',
      userId: null
    }))
    editModal.open({ ...subscription, endDate: '2026-07-01' })

    const cancelWrapper = await mountSuspended(SubscriptionCancellationModal)
    const cancelModal = exposedModal(cancelWrapper)
    cancelModal.open(subscription)
    await submitForm(cancelWrapper, { effectiveDate: today })
    expect(cancel).toHaveBeenCalledWith(subscription.id, {
      effectiveDate: '2026-07-26'
    })
    cancel.mockRejectedValueOnce(new Error('offline'))
    cancelModal.open(subscription)
    await submitForm(cancelWrapper, { effectiveDate: today })
    expect(toastMocks.addErrorToast).toHaveBeenCalledWith('Subscription could not be canceled.')
    cancelModal.open({ ...subscription, endDate: '2026-07-01' })
  })
})

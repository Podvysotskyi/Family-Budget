import { mockComponent, mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import GoalCloseModal from '../../app/components/goals/GoalCloseModal.vue'
import GoalCreateModal from '../../app/components/goals/GoalCreateModal.vue'
import GoalEditModal from '../../app/components/goals/GoalEditModal.vue'
import { useGoalsStore } from '../../app/stores/goals'
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

const goal = {
  id: 'goal-1',
  householdId: 'household-1',
  name: 'Emergency fund',
  userId: null,
  user: null,
  startDate: '2026-01-01',
  endDate: null,
  includeInBudget: true,
  currentTarget: {
    id: 'target-1',
    date: '2026-01-01',
    type: 'monthly' as const,
    amount: 500
  },
  targets: [],
  transactionCount: 0,
  canDeletePermanently: true,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01'
}

describe('goal modal flows', () => {
  beforeEach(resetModalHarness)

  it('creates, edits, and closes goals with success and error feedback', async () => {
    const createWrapper = await mountSuspended(GoalCreateModal)
    seedHouseholdStore()
    const store = useGoalsStore()
    const create = vi.spyOn(store, 'createHouseholdGoal').mockResolvedValue(undefined)
    const update = vi.spyOn(store, 'updateGoal').mockResolvedValue(undefined)
    const close = vi.spyOn(store, 'closeGoal').mockResolvedValue(undefined)
    exposedModal(createWrapper).open(user.id)
    await submitForm(createWrapper, {
      name: ' Emergency ',
      startDate: today,
      endDate: null,
      includeInBudget: true,
      targetType: 'monthly',
      targetAmount: 500
    })
    expect(create).toHaveBeenCalledWith('household-1', expect.objectContaining({
      name: 'Emergency',
      userId: user.id
    }))

    const editWrapper = await mountSuspended(GoalEditModal)
    exposedModal(editWrapper).open(goal)
    await submitForm(editWrapper, {
      name: ' Updated goal ',
      userId: 'household',
      endDate: today,
      includeInBudget: false,
      targetType: 'total',
      targetAmount: 1000
    })
    expect(update).toHaveBeenCalledWith(goal, expect.objectContaining({
      name: 'Updated goal',
      userId: null
    }))

    const closeWrapper = await mountSuspended(GoalCloseModal)
    exposedModal(closeWrapper).open(goal)
    closeWrapper.findComponent({ name: 'ConfirmationModal' }).vm.$emit('confirm')
    await nextTick()
    expect(close).toHaveBeenCalledWith(goal)

    create.mockRejectedValueOnce(new Error('offline'))
    exposedModal(createWrapper).open(user.id)
    await submitForm(createWrapper, {
      name: 'Failure',
      startDate: today,
      endDate: null,
      includeInBudget: true,
      targetType: 'weekly',
      targetAmount: 10
    })
    expect(toastMocks.addErrorToast).toHaveBeenCalledWith('Goal could not be created.')
  })
})

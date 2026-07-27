import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCreditCardsStore } from '../../app/stores/credit-cards'
import { useGoalsStore } from '../../app/stores/goals'
import { useSubscriptionsStore } from '../../app/stores/subscriptions'
import {
  creditCard,
  goal,
  household,
  resetStoreHarness,
  subscription,
  user
} from './support/store-harness'

const mocks = vi.hoisted(() => ({
  addErrorToast: vi.fn(),
  deleteRequest: vi.fn(),
  get: vi.fn().mockResolvedValue({}),
  patch: vi.fn(),
  post: vi.fn()
}))

mockNuxtImport('useStoreApi', () => () => ({
  delete: mocks.deleteRequest,
  get: mocks.get,
  patch: mocks.patch,
  post: mocks.post
}))
mockNuxtImport('useAppToast', () => () => ({
  addErrorToast: mocks.addErrorToast,
  addSuccessToast: vi.fn()
}))
mockNuxtImport('useAbortController', () => () => ({
  createAbortController: (store: { abortController: AbortController | null }) => {
    store.abortController?.abort()
    const controller = new AbortController()
    store.abortController = controller
    return controller
  }
}))

describe('financial resource stores', () => {
  beforeEach(resetStoreHarness)

  it('loads and mutates credit cards, subscriptions, and goals', async () => {
    const cards = useCreditCardsStore()
    mocks.get
      .mockResolvedValueOnce({ creditCards: [creditCard] })
      .mockResolvedValueOnce({ creditCards: [creditCard] })
    await cards.fetchHouseholdCreditCards(household.householdId)
    await cards.fetchUserCreditCards(user.id)
    expect(cards.hasHouseholdCreditCards).toBe(true)
    expect(cards.hasUserCreditCards(user.id)).toBe(true)
    await cards.createHouseholdCreditCard(household.householdId, {} as never)
    await cards.createUserCreditCard(user.id, {} as never)
    await cards.updateCreditCard(creditCard.id, {} as never)
    await cards.cancelCreditCard(creditCard.id, {} as never)
    await cards.updateCreditCardBalance(creditCard.id, {} as never)

    const subscriptions = useSubscriptionsStore()
    mocks.get
      .mockResolvedValueOnce({ subscriptions: [subscription] })
      .mockResolvedValueOnce({ subscriptions: [subscription] })
    await subscriptions.fetchHouseholdSubscriptions(household.householdId)
    await subscriptions.fetchUserSubscriptions(user.id)
    expect(subscriptions.hasHouseholdSubscriptions).toBe(true)
    expect(subscriptions.hasUserSubscriptions(user.id)).toBe(true)
    await subscriptions.createHouseholdSubscription(household.householdId, {} as never)
    await subscriptions.createUserSubscription(user.id, {} as never)
    await subscriptions.updateSubscription(subscription.id, {} as never)
    await subscriptions.cancelSubscription(subscription.id, {} as never)

    const goals = useGoalsStore()
    mocks.get.mockResolvedValueOnce({ goals: [goal] })
    await goals.fetchHouseholdGoals(household.householdId)
    expect(goals.hasHouseholdGoals).toBe(true)
    await goals.createHouseholdGoal(household.householdId, {} as never)
    await goals.updateGoal(goal, {} as never)
    await goals.closeGoal(goal)
  })

  it('handles list failures and canceled fetches without stale loading updates', async () => {
    const cards = useCreditCardsStore()
    mocks.get.mockRejectedValueOnce(new Error('offline'))
    await cards.fetchHouseholdCreditCards(household.householdId)
    expect(mocks.addErrorToast).toHaveBeenCalledWith('Credit cards could not be loaded')
    await cards.fetchUserCreditCards('')

    const subscriptions = useSubscriptionsStore()
    mocks.get.mockRejectedValueOnce(new Error('offline'))
    await subscriptions.fetchUserSubscriptions(user.id)
    expect(mocks.addErrorToast).toHaveBeenCalledWith('Subscriptions could not be loaded')
    await subscriptions.fetchHouseholdSubscriptions('')

    const goals = useGoalsStore()
    mocks.get.mockRejectedValueOnce(new Error('offline'))
    await goals.fetchHouseholdGoals(household.householdId)
    expect(mocks.addErrorToast).toHaveBeenCalledWith('Goals could not be loaded')
    await goals.fetchHouseholdGoals('')
  })
})

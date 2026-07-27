import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import SubscriptionsPageList from '../../app/components/subscriptions/SubscriptionsPageList.vue'
import SubscriptionsPageListItem from '../../app/components/subscriptions/SubscriptionsPageListItem.vue'
import { useAuthStore } from '../../app/stores/auth'
import type { Subscription } from '../../app/types/subscriptions'

describe('subscription resource list', () => {
  beforeEach(seedAuthenticatedUser)

  it('filters canceled subscriptions and supports loading and empty states', async () => {
    const active = createSubscription({ id: 'active', name: 'Active subscription' })
    const canceled = createSubscription({
      id: 'canceled',
      name: 'Canceled subscription',
      endDate: '2026-06-01'
    })
    const wrapper = await mountSuspended(SubscriptionsPageList, {
      props: {
        subscriptions: [active, canceled],
        isLoading: false
      }
    })

    expect(wrapper.text()).toContain(active.name)
    expect(wrapper.text()).not.toContain(canceled.name)
    await wrapper.get('button[role="switch"]').trigger('click')
    expect(wrapper.text()).toContain(canceled.name)
    await wrapper.setProps({ isLoading: true })
    expect(wrapper.findAllComponents({ name: 'USkeleton' })).toHaveLength(2)
    await wrapper.setProps({ subscriptions: [], isLoading: false })
    expect(wrapper.text()).toContain('No subscriptions found.')
  })

  it('opens owned action modals and propagates saved events', async () => {
    const wrapper = await mountSuspended(SubscriptionsPageListItem, {
      props: {
        subscription: createSubscription({ type: 'yearly' })
      }
    })
    const editModal = wrapper.findComponent({ name: 'SubscriptionEditModal' })
    const cancellationModal = wrapper.findComponent({ name: 'SubscriptionCancellationModal' })

    await wrapper.get('[aria-label="Edit subscription"]').trigger('click')
    await wrapper.get('[aria-label="Cancel subscription"]').trigger('click')
    editModal.vm.$emit('saved')
    cancellationModal.vm.$emit('saved')
    expect(wrapper.emitted('refresh')).toHaveLength(2)
    expect(wrapper.text()).toContain('Yearly')
  })

  it('hides actions for canceled subscriptions and subscriptions assigned to another user', async () => {
    const canceledWrapper = await mountSuspended(SubscriptionsPageListItem, {
      props: {
        subscription: createSubscription({ endDate: '2026-06-01' })
      }
    })
    const otherUserWrapper = await mountSuspended(SubscriptionsPageListItem, {
      props: {
        subscription: createSubscription({
          user: {
            userId: 'user-2',
            name: 'Other person',
            email: 'other@example.com'
          }
        })
      }
    })

    expect(canceledWrapper.find('[aria-label="Edit subscription"]').exists()).toBe(false)
    expect(canceledWrapper.text()).toContain('Canceled')
    expect(otherUserWrapper.find('[aria-label="Cancel subscription"]').exists()).toBe(false)
    expect(otherUserWrapper.text()).toContain('Other person')
  })
})

function seedAuthenticatedUser() {
  setActivePinia(createPinia())
  const authStore = useAuthStore()
  authStore.user = {
    id: 'user-1',
    email: 'person@example.com',
    name: 'Person'
  }
  authStore.isAuthenticated = true
}

function createSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'subscription-1',
    name: 'Streaming',
    user: null,
    type: 'monthly',
    startDate: '2026-01-01',
    endDate: null,
    nextChargeDate: '2026-08-01',
    amount: 20,
    autopay: true,
    ...overrides
  }
}

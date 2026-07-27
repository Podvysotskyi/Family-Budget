import { mountSuspended } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import GoalsPageList from '../../app/components/goals/GoalsPageList.vue'
import GoalsPageListItem from '../../app/components/goals/GoalsPageListItem.vue'
import { useAuthStore } from '../../app/stores/auth'
import type { Goal } from '../../app/types/goals'

describe('goal resource list', () => {
  beforeEach(seedAuthenticatedUser)

  it('filters closed goals and supports loading and empty states', async () => {
    const active = createGoal({ id: 'active', name: 'Active goal', endDate: null })
    const closed = createGoal({ id: 'closed', name: 'Closed goal', endDate: '2020-01-01' })
    const wrapper = await mountSuspended(GoalsPageList, {
      props: {
        goals: [active, closed],
        isLoading: false
      }
    })

    expect(wrapper.text()).toContain(active.name)
    expect(wrapper.text()).not.toContain(closed.name)
    await wrapper.get('button[role="switch"]').trigger('click')
    expect(wrapper.text()).toContain(closed.name)
    await wrapper.setProps({ isLoading: true })
    expect(wrapper.findAllComponents({ name: 'USkeleton' })).toHaveLength(2)
    await wrapper.setProps({ goals: [], isLoading: false })
    expect(wrapper.text()).toContain('No goals found.')
  })

  it('opens owned action modals and propagates saved events', async () => {
    const wrapper = await mountSuspended(GoalsPageListItem, {
      props: {
        goal: createGoal({
          currentTarget: {
            id: 'target-1',
            date: '2026-01-01',
            type: 'weekly',
            amount: 250
          }
        })
      }
    })
    const editModal = wrapper.findComponent({ name: 'GoalEditModal' })
    const closeModal = wrapper.findComponent({ name: 'GoalCloseModal' })

    await wrapper.get('[aria-label="Edit goal"]').trigger('click')
    await wrapper.get('[aria-label="Close goal"]').trigger('click')
    editModal.vm.$emit('saved')
    closeModal.vm.$emit('saved')
    expect(wrapper.emitted('refresh')).toHaveLength(2)
    expect(wrapper.text()).toContain('Weekly')
  })

  it('hides actions for closed goals and goals assigned to another user', async () => {
    const otherUserWrapper = await mountSuspended(GoalsPageListItem, {
      props: {
        goal: createGoal({
          userId: 'user-2',
          user: {
            userId: 'user-2',
            name: 'Other person',
            email: 'other@example.com'
          }
        })
      }
    })
    const closedWrapper = await mountSuspended(GoalsPageListItem, {
      props: {
        goal: createGoal({
          endDate: '2020-01-01',
          currentTarget: {
            id: 'target-2',
            date: '2020-01-01',
            type: 'total',
            amount: 1000
          }
        })
      }
    })

    expect(otherUserWrapper.find('[aria-label="Edit goal"]').exists()).toBe(false)
    expect(otherUserWrapper.text()).toContain('Other person')
    expect(closedWrapper.find('[aria-label="Close goal"]').exists()).toBe(false)
    expect(closedWrapper.text()).toContain('Closed')
    expect(closedWrapper.text()).toContain('Total')
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

function createGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    householdId: 'household-1',
    name: 'Emergency fund',
    userId: null,
    user: null,
    startDate: '2026-01-01',
    endDate: null,
    includeInBudget: true,
    currentTarget: null,
    targets: [],
    transactionCount: 0,
    canDeletePermanently: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides
  }
}

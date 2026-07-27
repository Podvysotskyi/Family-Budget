import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import CreditCardsPageList from '../../app/components/credit-cards/CreditCardsPageList.vue'
import type { CreditCard } from '../../app/types/credit-cards'

const activeCard = createCreditCard({
  id: 'active-card',
  name: 'Active card',
  endDate: null
})
const canceledCard = createCreditCard({
  id: 'canceled-card',
  name: 'Canceled card',
  endDate: '2026-07-01'
})

describe('credit card list', () => {
  it('shows active cards and hides canceled cards by default', async () => {
    const wrapper = await mountSuspended(CreditCardsPageList, {
      props: {
        creditCards: [activeCard, canceledCard],
        isLoading: false
      }
    })

    expect(wrapper.text()).toContain('Active card')
    expect(wrapper.text()).not.toContain('Canceled card')
  })

  it('shows canceled cards when the active-only filter is disabled', async () => {
    const wrapper = await mountSuspended(CreditCardsPageList, {
      props: {
        creditCards: [activeCard, canceledCard],
        isLoading: false
      }
    })
    const activeOnlySwitch = wrapper.get('button[role="switch"]')

    await activeOnlySwitch.trigger('click')

    expect(wrapper.text()).toContain('Active card')
    expect(wrapper.text()).toContain('Canceled card')
  })
})

function createCreditCard(overrides: Partial<CreditCard>): CreditCard {
  return {
    id: 'card-1',
    name: 'Card',
    user: null,
    startDate: '2026-01-01',
    endDate: null,
    dueDate: '2026-07-31',
    currentBalance: 100,
    currentLimit: 1000,
    ...overrides
  }
}

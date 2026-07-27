import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createHmac } from 'node:crypto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, inject, it } from 'vitest'
import { useCreditCardsStore } from '../../app/stores/credit-cards'
import proxyHandler from '../../server/api/[...path]'
import type { CreditCardE2EContext } from './context'

describe('credit-card store E2E', () => {
  const fixture = inject('creditCardE2E')
  let sessionCookie: string

  beforeAll(() => {
    sessionCookie = createSessionCookie(fixture)
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    Object.assign(useRuntimeConfig(), {
      apiBase: fixture.apiBase,
      internalApiSecret: fixture.internalSecret,
      sessionSecret: fixture.sessionSecret
    })
  })

  it('persists every store action through the Nuxt proxy and refreshes both lists', async () => {
    registerProxyEndpoint(
      `/households/${fixture.householdId}/credit-cards`,
      ['GET', 'POST'],
      sessionCookie
    )
    registerProxyEndpoint(
      `/users/${fixture.currentUser.id}/credit-cards`,
      ['GET', 'POST'],
      sessionCookie
    )

    const store = useCreditCardsStore()
    await store.createHouseholdCreditCard(fixture.householdId, {
      name: 'Household Card',
      userId: null,
      startDate: '2020-01-01',
      dueDate: '2020-01-15',
      limit: 2_000,
      balance: 50
    })
    await store.createUserCreditCard(fixture.currentUser.id, {
      name: 'User Card',
      userId: fixture.currentUser.id,
      startDate: '2020-01-01',
      dueDate: '2020-01-20',
      limit: 1_000,
      balance: 100
    })

    await store.fetchUserCreditCards(fixture.currentUser.id)
    const userCard = store.userCreditCardList(fixture.currentUser.id)[0]!
    registerProxyEndpoint(`/credit-cards/${userCard.id}`, ['PATCH'], sessionCookie)
    registerProxyEndpoint(`/credit-cards/${userCard.id}/balance`, ['PATCH'], sessionCookie)
    registerProxyEndpoint(`/credit-cards/${userCard.id}/cancel`, ['PATCH'], sessionCookie)

    await store.fetchHouseholdCreditCards(fixture.householdId)
    await store.fetchUserCreditCards(fixture.currentUser.id)

    expect(store.householdCreditCardList).toEqual([
      expect.objectContaining({
        name: 'Household Card',
        user: null,
        currentBalance: 50,
        currentLimit: 2_000
      })
    ])
    expect(store.userCreditCardList(fixture.currentUser.id)).toEqual([
      expect.objectContaining({
        id: userCard.id,
        name: 'User Card',
        currentBalance: 100,
        currentLimit: 1_000
      })
    ])

    await store.updateCreditCard(userCard.id, {
      name: 'Updated User Card',
      userId: fixture.currentUser.id,
      startDate: '2020-01-01',
      dueDate: '2020-01-25',
      limit: 1_500
    })
    await store.updateCreditCardBalance(userCard.id, {
      date: '2020-02-01',
      balance: 250
    })
    await store.fetchUserCreditCards(fixture.currentUser.id)

    expect(store.userCreditCardList(fixture.currentUser.id)).toEqual([
      expect.objectContaining({
        id: userCard.id,
        name: 'Updated User Card',
        dueDate: '2020-01-25',
        currentBalance: 250,
        currentLimit: 1_500
      })
    ])

    await store.cancelCreditCard(userCard.id, {
      effectiveDate: '2020-02-15'
    })
    await store.fetchUserCreditCards(fixture.currentUser.id)

    expect(store.userCreditCardList(fixture.currentUser.id)).toEqual([
      expect.objectContaining({
        id: userCard.id,
        endDate: '2020-02-15'
      })
    ])
  })

  function registerProxyEndpoint(path: string, methods: Array<'GET' | 'POST' | 'PATCH'>, cookie: string) {
    for (const method of methods) {
      registerEndpoint(`/api${path}`, {
        method,
        handler: async (event) => {
          event.context.params = {
            ...event.context.params,
            path: path.slice(1)
          }
          event.node.req.headers.cookie = `family-budget.session=${cookie}`

          return proxyHandler(event)
        }
      })
    }
  }
})

function createSessionCookie(fixture: CreditCardE2EContext) {
  const payload = Buffer.from(JSON.stringify(fixture.currentUser), 'utf8').toString('base64url')
  const signature = createHmac('sha256', fixture.sessionSecret).update(payload).digest('base64url')

  return `${payload}.${signature}`
}

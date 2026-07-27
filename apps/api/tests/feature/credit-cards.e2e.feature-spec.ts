import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import request from 'supertest'
import { DataSource } from 'typeorm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { RequestUser } from '../../src/modules/auth/request-user'
import { CreditCardBalanceEntity } from '../../src/modules/credit-cards/entities/credit-card-balance.entity'
import { CreditCardEntity } from '../../src/modules/credit-cards/entities/credit-card.entity'
import { CreditCardLimitEntity } from '../../src/modules/credit-cards/entities/credit-card-limit.entity'
import { createDatabaseOptions } from '../../src/modules/database/database.config'
import { HouseholdEntity } from '../../src/modules/households/entities/household.entity'
import { UserEntity } from '../../src/modules/users/entities/user.entity'
import { productionMigrations } from './support/database'

const internalSecret = 'test-internal-secret'
const initialCard = {
  name: 'Rewards',
  startDate: '2020-01-01',
  dueDate: '2020-01-15',
  limit: 1_000,
  balance: 100
}

describe('credit-card API E2E', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL
  const originalInternalSecret = process.env.INTERNAL_API_SECRET
  const originalSchedulingEnabled = process.env.SCHEDULING_ENABLED
  let app: INestApplication
  let container: StartedPostgreSqlContainer
  let dataSource: DataSource
  let fixture: Awaited<ReturnType<typeof seedHouseholds>>

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start()
    process.env.DATABASE_URL = container.getConnectionUri()
    process.env.INTERNAL_API_SECRET = internalSecret
    process.env.SCHEDULING_ENABLED = 'false'

    dataSource = new DataSource({
      ...createDatabaseOptions({
        url: container.getConnectionUri()
      }),
      migrations: productionMigrations
    })
    await dataSource.initialize()
    await dataSource.runMigrations()

    const { AppModule } = await import('../../src/app.module')
    const moduleRef = await Test
      .createTestingModule({
        imports: [AppModule]
      })
      .overrideProvider(DataSource)
      .useValue(dataSource)
      .compile()

    app = moduleRef.createNestApplication()
    await app.init()
  }, 120_000)

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE households CASCADE')
    fixture = await seedHouseholds(dataSource)
  })

  afterAll(async () => {
    await app?.close()
    if (dataSource?.isInitialized) {
      await dataSource.destroy()
    }
    await container?.stop()
    restoreEnvironmentVariable('DATABASE_URL', originalDatabaseUrl)
    restoreEnvironmentVariable('INTERNAL_API_SECRET', originalInternalSecret)
    restoreEnvironmentVariable('SCHEDULING_ENABLED', originalSchedulingEnabled)
  })

  it('persists the user credit-card lifecycle through the store-facing endpoints', async () => {
    const input = {
      ...initialCard,
      userId: fixture.currentUser.id
    }
    const createResponse = await request(app.getHttpServer())
      .post(`/users/${fixture.currentUser.id}/credit-cards`)
      .set(authHeaders(fixture.currentUser))
      .send(input)
      .expect(201)
    const createdCard = createResponse.body.creditCard as CreditCardResponse

    expect(createdCard).toMatchObject({
      name: 'Rewards',
      user: {
        userId: fixture.currentUser.id,
        name: fixture.currentUser.name
      },
      startDate: '2020-01-01',
      endDate: null,
      dueDate: '2020-01-15',
      currentBalance: 100,
      currentLimit: 1_000
    })

    const listResponse = await request(app.getHttpServer())
      .get(`/users/${fixture.currentUser.id}/credit-cards`)
      .set(authHeaders(fixture.currentUser))
      .expect(200)

    expect(listResponse.body).toEqual({
      creditCards: [createdCard]
    })

    const updateResponse = await request(app.getHttpServer())
      .patch(`/credit-cards/${createdCard.id}`)
      .set(authHeaders(fixture.currentUser))
      .send({
        ...input,
        name: 'Travel Rewards',
        dueDate: '2020-01-20',
        limit: 1_500
      })
      .expect(200)

    expect(updateResponse.body.creditCard).toMatchObject({
      id: createdCard.id,
      name: 'Travel Rewards',
      dueDate: '2020-01-20',
      currentBalance: 100,
      currentLimit: 1_500
    })

    await request(app.getHttpServer())
      .patch(`/credit-cards/${createdCard.id}/balance`)
      .set(authHeaders(fixture.currentUser))
      .send({
        date: '2020-02-01',
        balance: 250
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.balance).toMatchObject({
          creditCardId: createdCard.id,
          date: '2020-02-01',
          balance: 250
        })
      })

    await dataSource.getRepository(CreditCardLimitEntity).save({
      creditCardId: createdCard.id,
      date: '2020-02-01',
      limit: 2_000
    })

    await request(app.getHttpServer())
      .patch(`/credit-cards/${createdCard.id}/cancel`)
      .set(authHeaders(fixture.currentUser))
      .send({
        effectiveDate: '2020-01-15'
      })
      .expect(200)
      .expect({
        canceled: true
      })

    await request(app.getHttpServer())
      .patch(`/credit-cards/${createdCard.id}`)
      .set(authHeaders(fixture.currentUser))
      .send(input)
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('Canceled credit cards cannot be edited')
      })

    await request(app.getHttpServer())
      .patch(`/credit-cards/${createdCard.id}/balance`)
      .set(authHeaders(fixture.currentUser))
      .send({
        date: '2020-01-15',
        balance: 50
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('Canceled credit cards cannot be edited')
      })

    await request(app.getHttpServer())
      .patch(`/credit-cards/${createdCard.id}/cancel`)
      .set(authHeaders(fixture.currentUser))
      .send({
        effectiveDate: '2020-01-15'
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('Credit card is already canceled')
      })

    const persistedCard = await dataSource.getRepository(CreditCardEntity).findOneByOrFail({
      id: createdCard.id
    })
    const persistedLimits = await dataSource.getRepository(CreditCardLimitEntity).find({
      where: { creditCardId: createdCard.id },
      order: { date: 'ASC' }
    })
    const persistedBalances = await dataSource.getRepository(CreditCardBalanceEntity).find({
      where: { creditCardId: createdCard.id },
      order: { date: 'ASC' }
    })

    expect(persistedCard).toMatchObject({
      householdId: fixture.household.id,
      userId: fixture.currentUser.id,
      name: 'Travel Rewards',
      startDate: '2020-01-01',
      endDate: '2020-01-15',
      dueDate: '2020-01-20'
    })
    expect(persistedLimits).toHaveLength(1)
    expect(persistedLimits[0]).toMatchObject({
      date: '2020-01-01',
      limit: 1_500
    })
    expect(persistedBalances).toHaveLength(1)
    expect(persistedBalances[0]).toMatchObject({
      date: '2020-01-01',
      balance: 100
    })
  })

  it('separates household and user lists and enforces authentication and ownership', async () => {
    await request(app.getHttpServer())
      .get(`/users/${fixture.currentUser.id}/credit-cards`)
      .expect(401)

    const householdCard = await createCard(
      app,
      `/households/${fixture.household.id}/credit-cards`,
      fixture.currentUser,
      {
        ...initialCard,
        name: 'Household Card',
        userId: null
      }
    )
    const currentUserCard = await createCard(
      app,
      `/users/${fixture.currentUser.id}/credit-cards`,
      fixture.currentUser,
      {
        ...initialCard,
        name: 'Current User Card',
        userId: fixture.currentUser.id
      }
    )
    const otherUserCard = await createCard(
      app,
      `/users/${fixture.otherUser.id}/credit-cards`,
      fixture.otherUser,
      {
        ...initialCard,
        name: 'Other User Card',
        userId: fixture.otherUser.id
      }
    )

    await request(app.getHttpServer())
      .get(`/households/${fixture.household.id}/credit-cards`)
      .set(authHeaders(fixture.currentUser))
      .expect(200)
      .expect({
        creditCards: [householdCard]
      })

    await request(app.getHttpServer())
      .get(`/users/${fixture.currentUser.id}/credit-cards`)
      .set(authHeaders(fixture.currentUser))
      .expect(200)
      .expect({
        creditCards: [currentUserCard]
      })

    await request(app.getHttpServer())
      .get(`/users/${fixture.otherUser.id}/credit-cards`)
      .set(authHeaders(fixture.currentUser))
      .expect(403)

    await request(app.getHttpServer())
      .patch(`/credit-cards/${otherUserCard.id}`)
      .set(authHeaders(fixture.currentUser))
      .send({
        ...initialCard,
        userId: fixture.currentUser.id
      })
      .expect(404)

    await request(app.getHttpServer())
      .patch(`/credit-cards/${otherUserCard.id}/balance`)
      .set(authHeaders(fixture.currentUser))
      .send({
        date: '2020-01-01',
        balance: 200
      })
      .expect(404)

    await request(app.getHttpServer())
      .patch(`/credit-cards/${otherUserCard.id}/cancel`)
      .set(authHeaders(fixture.currentUser))
      .send({
        effectiveDate: '2020-01-01'
      })
      .expect(404)

    await request(app.getHttpServer())
      .get(`/households/${fixture.outsideHousehold.id}/credit-cards`)
      .set(authHeaders(fixture.currentUser))
      .expect(404)
  })

  it('rejects invalid creates and mutation dates without partial persistence', async () => {
    const invalidCreates = [
      {
        input: { ...initialCard, name: '', userId: fixture.currentUser.id },
        message: 'Credit card name is required'
      },
      {
        input: { ...initialCard, startDate: 'not-a-date', userId: fixture.currentUser.id },
        message: 'Credit card start date must be in YYYY-MM-DD format'
      },
      {
        input: { ...initialCard, dueDate: 'not-a-date', userId: fixture.currentUser.id },
        message: 'Credit card due date must be in YYYY-MM-DD format'
      },
      {
        input: { ...initialCard, limit: 0, userId: fixture.currentUser.id },
        message: 'Credit card limit must be greater than zero'
      },
      {
        input: { ...initialCard, balance: -1, userId: fixture.currentUser.id },
        message: 'Credit card balance must be zero or greater'
      }
    ]

    for (const invalidCreate of invalidCreates) {
      await request(app.getHttpServer())
        .post(`/users/${fixture.currentUser.id}/credit-cards`)
        .set(authHeaders(fixture.currentUser))
        .send(invalidCreate.input)
        .expect(400)
        .expect(({ body }) => {
          expect(body.message).toBe(invalidCreate.message)
        })
    }

    await request(app.getHttpServer())
      .post(`/households/${fixture.household.id}/credit-cards`)
      .set(authHeaders(fixture.currentUser))
      .send({
        ...initialCard,
        userId: fixture.otherUser.id
      })
      .expect(403)

    expect(await dataSource.getRepository(CreditCardEntity).count()).toBe(0)
    expect(await dataSource.getRepository(CreditCardLimitEntity).count()).toBe(0)
    expect(await dataSource.getRepository(CreditCardBalanceEntity).count()).toBe(0)

    const card = await createCard(
      app,
      `/users/${fixture.currentUser.id}/credit-cards`,
      fixture.currentUser,
      {
        ...initialCard,
        userId: fixture.currentUser.id
      }
    )
    const invalidMutations = [
      {
        path: `/credit-cards/${card.id}/balance`,
        input: { date: '2019-12-31', balance: 50 },
        message: 'Credit card balance date must be on or after the start date'
      },
      {
        path: `/credit-cards/${card.id}/balance`,
        input: { date: '9999-12-31', balance: 50 },
        message: 'Credit card balance date cannot be in the future'
      },
      {
        path: `/credit-cards/${card.id}/balance`,
        input: { date: '2020-01-01', balance: -1 },
        message: 'Credit card balance must be zero or greater'
      },
      {
        path: `/credit-cards/${card.id}/cancel`,
        input: { effectiveDate: '2019-12-31' },
        message: 'Credit card cancellation effective date must be on or after the start date'
      }
    ]

    for (const invalidMutation of invalidMutations) {
      await request(app.getHttpServer())
        .patch(invalidMutation.path)
        .set(authHeaders(fixture.currentUser))
        .send(invalidMutation.input)
        .expect(400)
        .expect(({ body }) => {
          expect(body.message).toBe(invalidMutation.message)
        })
    }

    const persistedCard = await dataSource.getRepository(CreditCardEntity).findOneByOrFail({
      id: card.id
    })

    expect(persistedCard.endDate).toBeNull()
    expect(await dataSource.getRepository(CreditCardBalanceEntity).countBy({
      creditCardId: card.id
    })).toBe(1)
  })

  it('keeps legacy household cards visible and assigns cards in one-member households', async () => {
    await dataSource.getRepository(UserEntity).delete({
      id: fixture.otherUser.id
    })

    const legacyCard = await dataSource.getRepository(CreditCardEntity).save({
      householdId: fixture.household.id,
      userId: null,
      name: 'Legacy Household Card',
      startDate: '2020-01-01',
      endDate: null,
      dueDate: '2020-01-15'
    })
    await dataSource.getRepository(CreditCardLimitEntity).save({
      creditCardId: legacyCard.id,
      date: '2020-01-01',
      limit: 500
    })
    await dataSource.getRepository(CreditCardBalanceEntity).save({
      creditCardId: legacyCard.id,
      date: '2020-01-01',
      balance: 25
    })

    await request(app.getHttpServer())
      .get(`/users/${fixture.currentUser.id}/credit-cards`)
      .set(authHeaders(fixture.currentUser))
      .expect(200)
      .expect(({ body }) => {
        expect(body.creditCards).toEqual([
          expect.objectContaining({
            id: legacyCard.id,
            name: 'Legacy Household Card',
            user: expect.objectContaining({
              userId: fixture.currentUser.id
            })
          })
        ])
      })

    const createdCard = await createCard(
      app,
      `/households/${fixture.household.id}/credit-cards`,
      fixture.currentUser,
      {
        ...initialCard,
        name: 'New Household Card',
        userId: null
      }
    )

    expect(createdCard.user).toMatchObject({
      userId: fixture.currentUser.id
    })
    expect(await dataSource.getRepository(CreditCardEntity).findOneByOrFail({
      id: createdCard.id
    })).toMatchObject({
      userId: fixture.currentUser.id
    })

    const updateResponse = await request(app.getHttpServer())
      .patch(`/credit-cards/${legacyCard.id}`)
      .set(authHeaders(fixture.currentUser))
      .send({
        ...initialCard,
        name: 'Migrated Legacy Card',
        limit: 750,
        userId: null
      })
      .expect(200)

    expect(updateResponse.body.creditCard).toMatchObject({
      id: legacyCard.id,
      name: 'Migrated Legacy Card',
      user: {
        userId: fixture.currentUser.id,
        name: fixture.currentUser.name,
        email: fixture.currentUser.email,
        avatarUrl: null
      },
      currentLimit: 750
    })
    expect(await dataSource.getRepository(CreditCardEntity).findOneByOrFail({
      id: legacyCard.id
    })).toMatchObject({
      userId: fixture.currentUser.id
    })
  })
})

interface CreditCardResponse {
  id: string
  name: string
  user: {
    userId: string
    name: string
    email: string
    avatarUrl: string | null
  } | null
  startDate: string
  endDate: string | null
  dueDate: string
  currentBalance: number | null
  currentLimit: number | null
}

async function seedHouseholds(dataSource: DataSource) {
  const householdsRepository = dataSource.getRepository(HouseholdEntity)
  const usersRepository = dataSource.getRepository(UserEntity)
  const household = await householdsRepository.save({
    name: 'Primary Household'
  })
  const outsideHousehold = await householdsRepository.save({
    name: 'Outside Household'
  })
  const currentUser = await usersRepository.save({
    email: 'current@example.com',
    name: 'Current User',
    avatarUrl: null,
    googleId: 'current-google-id',
    householdId: household.id
  })
  const otherUser = await usersRepository.save({
    email: 'other@example.com',
    name: 'Other User',
    avatarUrl: null,
    googleId: 'other-google-id',
    householdId: household.id
  })
  return {
    household,
    outsideHousehold,
    currentUser,
    otherUser
  }
}

async function createCard(
  app: INestApplication,
  path: string,
  user: UserEntity,
  input: Record<string, unknown>
) {
  const response = await request(app.getHttpServer())
    .post(path)
    .set(authHeaders(user))
    .send(input)
    .expect(201)

  return response.body.creditCard as CreditCardResponse
}

function authHeaders(user: RequestUser) {
  return {
    'x-family-budget-internal-secret': internalSecret,
    'x-family-budget-user': Buffer.from(JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl
    })).toString('base64url')
  }
}

function restoreEnvironmentVariable(name: string, value: string | undefined) {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, name)
    return
  }

  process.env[name] = value
}

import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { DataSource } from 'typeorm'
import type { TestProject } from 'vitest/node'
import { createDatabaseOptions } from '../../../api/src/modules/database/database.config'
import { HouseholdEntity } from '../../../api/src/modules/households/entities/household.entity'
import { UserEntity } from '../../../api/src/modules/users/entities/user.entity'
import { productionMigrations } from '../../../api/tests/feature/support/database'
import type { CreditCardE2EContext } from './context'

const internalSecret = 'test-internal-secret'
const sessionSecret = 'test-session-secret-with-at-least-32-characters'

export default async function setup(project: TestProject) {
  const originalDatabaseUrl = process.env.DATABASE_URL
  const originalInternalSecret = process.env.INTERNAL_API_SECRET
  const originalSchedulingEnabled = process.env.SCHEDULING_ENABLED
  let app: INestApplication | undefined
  let container: StartedPostgreSqlContainer | undefined
  let dataSource: DataSource | undefined

  try {
    container = await new PostgreSqlContainer('postgres:17-alpine').start()
    const databaseUrl = container.getConnectionUri()
    process.env.DATABASE_URL = databaseUrl
    process.env.INTERNAL_API_SECRET = internalSecret
    process.env.SCHEDULING_ENABLED = 'false'

    dataSource = new DataSource({
      ...createDatabaseOptions({
        url: databaseUrl
      }),
      migrations: productionMigrations
    })
    await dataSource.initialize()
    await dataSource.runMigrations()

    const { AppModule } = await import('../../../api/src/app.module')
    const moduleRef = await Test
      .createTestingModule({
        imports: [AppModule]
      })
      .overrideProvider(DataSource)
      .useValue(dataSource)
      .compile()

    app = moduleRef.createNestApplication()
    await app.listen(0, '127.0.0.1')

    const fixture = await seedHousehold(dataSource)
    project.provide('creditCardE2E', {
      apiBase: await app.getUrl(),
      currentUser: {
        id: fixture.currentUser.id,
        email: fixture.currentUser.email,
        name: fixture.currentUser.name,
        avatarUrl: fixture.currentUser.avatarUrl
      },
      householdId: fixture.household.id,
      internalSecret,
      sessionSecret
    } satisfies CreditCardE2EContext)
  } catch (error) {
    await closeResources(app, dataSource, container)
    restoreEnvironmentVariable('DATABASE_URL', originalDatabaseUrl)
    restoreEnvironmentVariable('INTERNAL_API_SECRET', originalInternalSecret)
    restoreEnvironmentVariable('SCHEDULING_ENABLED', originalSchedulingEnabled)
    throw error
  }

  return async () => {
    await closeResources(app, dataSource, container)
    restoreEnvironmentVariable('DATABASE_URL', originalDatabaseUrl)
    restoreEnvironmentVariable('INTERNAL_API_SECRET', originalInternalSecret)
    restoreEnvironmentVariable('SCHEDULING_ENABLED', originalSchedulingEnabled)
  }
}

async function seedHousehold(dataSource: DataSource) {
  const household = await dataSource.getRepository(HouseholdEntity).save({
    name: 'Store E2E Household'
  })
  const currentUser = await dataSource.getRepository(UserEntity).save({
    email: 'store-e2e@example.com',
    name: 'Store E2E User',
    avatarUrl: null,
    googleId: 'store-e2e-google-id',
    householdId: household.id
  })
  await dataSource.getRepository(UserEntity).save({
    email: 'store-e2e-other@example.com',
    name: 'Store E2E Other User',
    avatarUrl: null,
    googleId: 'store-e2e-other-google-id',
    householdId: household.id
  })

  return {
    household,
    currentUser
  }
}

async function closeResources(
  app: INestApplication | undefined,
  dataSource: DataSource | undefined,
  container: StartedPostgreSqlContainer | undefined
) {
  await app?.close()
  if (dataSource?.isInitialized) {
    await dataSource.destroy()
  }
  await container?.stop()
}

function restoreEnvironmentVariable(name: string, value: string | undefined) {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, name)
    return
  }

  process.env[name] = value
}

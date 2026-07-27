import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { DataSource } from 'typeorm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDatabaseOptions } from '../../src/modules/database/database.config'
import { AddBudgetCategorySummaryInclusion1782682000000 } from '../../src/modules/database/migrations/1782682000000-AddBudgetCategorySummaryInclusion'
import { AddCreditCards1782534000000 } from '../../src/modules/database/migrations/1782534000000-AddCreditCards'
import { AddGoals1782536000000 } from '../../src/modules/database/migrations/1782536000000-AddGoals'
import { AddSubscriptionAmountAndDateHistory1782535000000 } from '../../src/modules/database/migrations/1782535000000-AddSubscriptionAmountAndDateHistory'
import { AddSubscriptionAutopay1782532000000 } from '../../src/modules/database/migrations/1782532000000-AddSubscriptionAutopay'
import { AddSubscriptionTransactions1782530137343 } from '../../src/modules/database/migrations/1782530137343-AddSubscriptionTransactions'
import { DedupeSubscriptionDueDatesByPeriod1782679800000 } from '../../src/modules/database/migrations/1782679800000-DedupeSubscriptionDueDatesByPeriod'
import { InitialSchema1782527569927 } from '../../src/modules/database/migrations/1782527569927-InitialSchema'
import { MakeUserNameRequired1782681000000 } from '../../src/modules/database/migrations/1782681000000-MakeUserNameRequired'
import { RemoveSubscriptionNameUnique1782531000000 } from '../../src/modules/database/migrations/1782531000000-RemoveSubscriptionNameUnique'
import { RenameSubscriptionDatesToSubscriptionDueDates1782678143000 } from '../../src/modules/database/migrations/1782678143000-RenameSubscriptionDatesToSubscriptionDueDates'
import { StoreSubscriptionTransactionDates1782533000000 } from '../../src/modules/database/migrations/1782533000000-StoreSubscriptionTransactionDates'
import { UseGoalTargetDateUnique1782537000000 } from '../../src/modules/database/migrations/1782537000000-UseGoalTargetDateUnique'

const migrations = [
  InitialSchema1782527569927,
  AddSubscriptionTransactions1782530137343,
  RemoveSubscriptionNameUnique1782531000000,
  AddSubscriptionAutopay1782532000000,
  StoreSubscriptionTransactionDates1782533000000,
  AddCreditCards1782534000000,
  AddSubscriptionAmountAndDateHistory1782535000000,
  AddGoals1782536000000,
  UseGoalTargetDateUnique1782537000000,
  RenameSubscriptionDatesToSubscriptionDueDates1782678143000,
  DedupeSubscriptionDueDatesByPeriod1782679800000,
  MakeUserNameRequired1782681000000,
  AddBudgetCategorySummaryInclusion1782682000000
]

describe('database migrations', () => {
  let container: StartedPostgreSqlContainer
  let dataSource: DataSource

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start()
    dataSource = new DataSource({
      ...createDatabaseOptions({
        url: container.getConnectionUri()
      }),
      migrations
    })

    await dataSource.initialize()
  }, 120_000)

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy()
    }

    await container?.stop()
  })

  it('applies every production migration to a clean PostgreSQL database', async () => {
    const migrations = await dataSource.runMigrations()
    const pendingMigrations = await dataSource.showMigrations()
    const tables: Array<{ table_name: string }> = await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `)

    expect(migrations.length).toBeGreaterThan(0)
    expect(pendingMigrations).toBe(false)
    expect(tables.map(table => table.table_name)).toEqual(expect.arrayContaining([
      'budgets',
      'credit_cards',
      'goals',
      'households',
      'subscriptions',
      'users'
    ]))
  }, 30_000)
})

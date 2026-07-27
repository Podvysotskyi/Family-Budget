import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { DataSource } from 'typeorm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDatabaseOptions } from '../../src/modules/database/database.config'
import { productionMigrations } from './support/database'

describe('database migrations', () => {
  let container: StartedPostgreSqlContainer
  let dataSource: DataSource

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start()
    dataSource = new DataSource({
      ...createDatabaseOptions({
        url: container.getConnectionUri()
      }),
      migrations: productionMigrations
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

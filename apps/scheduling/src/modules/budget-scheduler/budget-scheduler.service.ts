import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { DataSource } from 'typeorm'
import { BudgetsRepository } from '../../../../api/src/modules/budgets/budgets.repository'
import { HouseholdsRepository } from '../../../../api/src/modules/households/households.repository'
import { buildBudgetInputsAroundCurrentMonth } from './budget-windows'

const advisoryLockId = 42_202_601

@Injectable()
export class BudgetSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BudgetSchedulerService.name)
  private isRunning = false

  constructor(
    @Inject(BudgetsRepository)
    private readonly budgetsRepository: BudgetsRepository,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
    @Inject(HouseholdsRepository)
    private readonly householdsRepository: HouseholdsRepository
  ) {}

  async onApplicationBootstrap() {
    await this.ensureBudgetHorizon()
    await this.syncActiveBudgetPeriods()
  }

  @Cron(CronExpression.EVERY_HOUR)
  async ensureBudgetHorizon() {
    await this.runWithLock('budget horizon scheduling', async () => {
      const householdIds = await this.householdsRepository.listIds()
      const budgets = buildBudgetInputsAroundCurrentMonth(householdIds, new Date(), this.getTimeZone())
      const createdCount = await this.budgetsRepository.ensureBudgets(budgets)

      this.logger.log(`Budget scheduling scanned ${householdIds.length} households, attempted ${budgets.length} budgets, created ${createdCount}, skipped ${budgets.length - createdCount}`)

      if (this.isMidnightInTimeZone()) {
        await this.syncActiveBudgetPeriods()
      }
    })
  }

  async syncActiveBudgetPeriods() {
    const referenceDate = this.getCurrentDateKey()
    const updatedCount = await this.budgetsRepository.syncActiveStates(referenceDate)

    this.logger.log(`Budget period activation updated ${updatedCount} budgets for ${referenceDate}`)
  }

  private isEnabled() {
    return process.env.SCHEDULING_ENABLED !== 'false'
  }

  private getTimeZone() {
    return process.env.SCHEDULING_TIMEZONE || 'America/Chicago'
  }

  private async tryAcquireLock() {
    const result = await this.dataSource.query<Array<{ locked: boolean }>>(
      'SELECT pg_try_advisory_lock($1) AS locked',
      [advisoryLockId]
    )

    return result[0]?.locked === true
  }

  private async releaseLock() {
    await this.dataSource.query('SELECT pg_advisory_unlock($1)', [advisoryLockId])
  }

  private async runWithLock(operationName: string, operation: () => Promise<void>) {
    if (!this.isEnabled()) {
      this.logger.debug(`${operationName} is disabled`)
      return
    }

    if (this.isRunning) {
      this.logger.warn(`Skipping ${operationName} because a previous run is still active`)
      return
    }

    this.isRunning = true
    let lockAcquired = false

    try {
      lockAcquired = await this.tryAcquireLock()

      if (!lockAcquired) {
        this.logger.warn(`Skipping ${operationName} because another instance holds the lock`)
        return
      }

      await operation()
    } catch (error) {
      this.logger.error(`${operationName} failed`, error instanceof Error ? error.stack : undefined)
    } finally {
      if (lockAcquired) {
        await this.releaseLock()
      }

      this.isRunning = false
    }
  }

  private getCurrentDateKey() {
    const parts = this.getDateParts()

    const year = parts.find(part => part.type === 'year')?.value
    const month = parts.find(part => part.type === 'month')?.value
    const day = parts.find(part => part.type === 'day')?.value

    if (!year || !month || !day) {
      throw new Error('Could not determine budget activation date')
    }

    return `${year}-${month}-${day}`
  }

  private isMidnightInTimeZone() {
    const hour = this.getDateParts().find(part => part.type === 'hour')?.value

    return hour === '00'
  }

  private getDateParts() {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: this.getTimeZone(),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false
    }).formatToParts(new Date())
  }
}

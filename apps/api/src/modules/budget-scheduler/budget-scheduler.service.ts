import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { DataSource } from 'typeorm'
import { buildBudgetInputsAroundCurrentMonth, buildBudgetInputsForMonth } from '../budgets/budget-windows'
import { BudgetsRepository } from '../budgets/budgets.repository'
import { BudgetType } from '../budgets/entities/budget-type'
import { HouseholdsRepository } from '../households/households.repository'
import type { SubscriptionEntity } from '../subscriptions/entities/subscription.entity'
import { SubscriptionsRepository } from '../subscriptions/subscriptions.repository'
import { UsersRepository } from '../users/users.repository'

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
    private readonly householdsRepository: HouseholdsRepository,
    @Inject(SubscriptionsRepository)
    private readonly subscriptionsRepository: SubscriptionsRepository,
    @Inject(UsersRepository)
    private readonly usersRepository: UsersRepository
  ) {}

  async onApplicationBootstrap() {
    await this.ensureBudgetHorizon()
    await this.syncActiveBudgetPeriods()
    await this.ensureCurrentSubscriptionDates()
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
        await this.ensureCurrentSubscriptionDates()
        await this.processSubscriptionAutopay()
      }
    })
  }

  async syncActiveBudgetPeriods() {
    const referenceDate = this.getCurrentDateKey()
    const updatedCount = await this.budgetsRepository.syncActiveStates(referenceDate)

    this.logger.log(`Budget period activation updated ${updatedCount} budgets for ${referenceDate}`)
  }

  async ensureCurrentSubscriptionDates() {
    const referenceDate = this.getCurrentDateKey()
    const createdCount = await this.subscriptionsRepository.ensureActiveMonthSubscriptionDates(referenceDate)

    this.logger.log(`Subscription date scheduling created ${createdCount} dates for active month containing ${referenceDate}`)
  }

  async processSubscriptionAutopay() {
    const referenceDate = this.getCurrentDateKey()
    const subscriptions = await this.subscriptionsRepository.listAutopayDueByDate(referenceDate)
    const fallbackUserIdsByHouseholdId = new Map<string, string | null>()
    let paidCount = 0
    let skippedCount = 0

    for (const subscription of subscriptions) {
      try {
        const paid = await this.processSubscriptionAutopayItem(
          subscription,
          referenceDate,
          fallbackUserIdsByHouseholdId
        )

        if (paid) {
          paidCount += 1
        } else {
          skippedCount += 1
        }
      } catch (error) {
        skippedCount += 1
        this.logger.error(
          `Subscription autopay failed for subscription ${subscription.id}`,
          error instanceof Error ? error.stack : undefined
        )
      }
    }

    this.logger.log(`Subscription autopay scanned ${subscriptions.length} subscriptions for ${referenceDate}, paid ${paidCount}, skipped ${skippedCount}`)
  }

  private isEnabled() {
    return process.env.SCHEDULING_ENABLED !== 'false'
  }

  private getTimeZone() {
    return process.env.SCHEDULING_TIMEZONE || 'America/Chicago'
  }

  private async processSubscriptionAutopayItem(
    subscription: SubscriptionEntity,
    referenceDate: string,
    fallbackUserIdsByHouseholdId: Map<string, string | null>
  ) {
    const transactionUserId = subscription.userId
      || await this.getFallbackSubscriptionTransactionUserId(subscription.householdId, fallbackUserIdsByHouseholdId)

    if (!transactionUserId) {
      this.logger.warn(`Skipping subscription autopay for ${subscription.id} because household ${subscription.householdId} has no members`)
      return false
    }

    const referenceDateParts = parseDateParts(referenceDate)
    await this.budgetsRepository.ensureBudgets(buildBudgetInputsForMonth(
      [subscription.householdId],
      referenceDateParts.year,
      referenceDateParts.month
    ))

    const occurrenceBudgets = await this.budgetsRepository.listByHouseholdIdAndDate(
      subscription.householdId,
      referenceDate
    )
    const monthBudget = occurrenceBudgets.find(budget => budget.type === BudgetType.Month)
    const weekBudget = occurrenceBudgets.find(budget => budget.type === BudgetType.Week)

    if (!monthBudget || !weekBudget) {
      this.logger.warn(`Skipping subscription autopay for ${subscription.id} because budgets for ${referenceDate} were not found`)
      return false
    }

    await this.subscriptionsRepository.createSubscriptionTransaction({
      amount: getSubscriptionAmountForDate(subscription, referenceDate),
      date: referenceDate,
      subscriptionId: subscription.id,
      userId: transactionUserId
    })

    return true
  }

  private async getFallbackSubscriptionTransactionUserId(
    householdId: string,
    fallbackUserIdsByHouseholdId: Map<string, string | null>
  ) {
    if (fallbackUserIdsByHouseholdId.has(householdId)) {
      return fallbackUserIdsByHouseholdId.get(householdId) || null
    }

    const firstMember = (await this.usersRepository.listByHouseholdId(householdId))[0]
    const userId = firstMember?.userId || null
    fallbackUserIdsByHouseholdId.set(householdId, userId)

    return userId
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

function parseDateParts(date: string) {
  const [year, month, day] = date.split('-').map(Number)

  return {
    year,
    month,
    day
  }
}

function getSubscriptionAmountForDate(subscription: SubscriptionEntity, date: string) {
  const sortedAmounts = [...(subscription.amounts || [])].sort((first, second) => first.date.localeCompare(second.date))
  let effectiveAmount: number | null = null

  for (const amount of sortedAmounts) {
    if (amount.date > date) {
      break
    }

    effectiveAmount = amount.amount
  }

  const amount = effectiveAmount ?? sortedAmounts[0]?.amount

  if (amount === undefined) {
    throw new Error(`Subscription ${subscription.id} has no amount`)
  }

  return amount
}

import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { MoreThan, type EntityManager, type SelectQueryBuilder, type Repository } from 'typeorm'
import { SubscriptionAmountEntity } from './entities/subscription-amount.entity'
import { SubscriptionDateEntity } from './entities/subscription-date.entity'
import { SubscriptionTransactionEntity } from './entities/subscription-transaction.entity'
import { SubscriptionEntity } from './entities/subscription.entity'
import { SubscriptionType } from './entities/subscription-type'

export interface SaveSubscriptionInput {
  householdId: string
  name: string
  userId: string | null
  type: SubscriptionType
  startDate: string
  endDate: string | null
  amount: number
  autopay: boolean
}

export interface UpdateSubscriptionInput extends SaveSubscriptionInput {
  amountEffectiveDate: string
  ensureDatesThroughDate: string
}

export interface CreateSubscriptionTransactionInput {
  amount: number
  date: string
  subscriptionId: string
  userId: string
}

@Injectable()
export class SubscriptionsRepository {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionsRepository: Repository<SubscriptionEntity>,
    @InjectRepository(SubscriptionDateEntity)
    private readonly subscriptionDatesRepository: Repository<SubscriptionDateEntity>,
    @InjectRepository(SubscriptionTransactionEntity)
    private readonly subscriptionTransactionsRepository: Repository<SubscriptionTransactionEntity>
  ) {}

  listByHouseholdId(householdId: string) {
    return orderSubscriptions(joinSubscriptionDetails(this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .where('subscription.household_id = :householdId', { householdId })))
      .getMany()
  }

  listByHouseholdIdAndDateRange(householdId: string, startDate: string, endDate: string) {
    return orderSubscriptions(this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .leftJoinAndSelect('subscription.amounts', 'subscriptionAmount')
      .innerJoinAndSelect(
        'subscription.dates',
        'subscriptionDate',
        'subscriptionDate.date >= :startDate AND subscriptionDate.date <= :endDate',
        { startDate, endDate }
      )
      .where('subscription.household_id = :householdId', { householdId })
      .andWhere('subscription.start_date <= :endDate', { endDate })
      .andWhere('(subscription.end_date IS NULL OR subscription.end_date >= :startDate)', { startDate }))
      .getMany()
  }

  listByUserIdAndDateRange(userId: string, startDate: string, endDate: string) {
    return orderSubscriptions(this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .leftJoinAndSelect('subscription.amounts', 'subscriptionAmount')
      .innerJoinAndSelect(
        'subscription.dates',
        'subscriptionDate',
        'subscriptionDate.date >= :startDate AND subscriptionDate.date <= :endDate',
        { startDate, endDate }
      )
      .where('subscription.user_id = :userId', { userId })
      .andWhere('subscription.start_date <= :endDate', { endDate })
      .andWhere('(subscription.end_date IS NULL OR subscription.end_date >= :startDate)', { startDate }))
      .getMany()
  }

  listAutopayDueByDate(date: string) {
    return orderSubscriptions(this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.amounts', 'subscriptionAmount')
      .innerJoinAndSelect('subscription.dates', 'subscriptionDate', 'subscriptionDate.date = :date', { date })
      .where('subscription.autopay = true')
      .andWhere('subscription.start_date <= :date', { date })
      .andWhere('(subscription.end_date IS NULL OR subscription.end_date >= :date)', { date }))
      .getMany()
  }

  create(input: SaveSubscriptionInput, ensureDatesThroughDate: string) {
    return this.subscriptionsRepository.manager.transaction(async (manager) => {
      const subscription = await manager.save(
        SubscriptionEntity,
        manager.create(SubscriptionEntity, {
          householdId: input.householdId,
          name: input.name,
          userId: input.userId,
          type: input.type,
          startDate: input.startDate,
          endDate: input.endDate,
          autopay: input.autopay
        })
      )

      await this.upsertSubscriptionAmount(manager, subscription.id, input.startDate, input.amount)
      await this.ensureSubscriptionDates(manager, [subscription], ensureDatesThroughDate)

      return manager.findOne(SubscriptionEntity, {
        where: {
          id: subscription.id
        },
        relations: {
          amounts: true,
          dates: true,
          user: true
        }
      })
    })
  }

  async update(householdId: string, subscriptionId: string, input: Omit<UpdateSubscriptionInput, 'householdId'>) {
    return this.subscriptionsRepository.manager.transaction(async (manager) => {
      const subscription = await manager.findOne(SubscriptionEntity, {
        where: {
          id: subscriptionId,
          householdId
        },
        relations: {
          amounts: true,
          dates: true
        }
      })

      if (!subscription) {
        return null
      }

      manager.merge(SubscriptionEntity, subscription, {
        name: input.name,
        userId: input.userId,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate,
        autopay: input.autopay
      })

      await manager.save(SubscriptionEntity, subscription)
      const shouldUpdateAmount = shouldUpsertSubscriptionAmount(subscription.amounts || [], input.amountEffectiveDate, input.amount)

      if (shouldUpdateAmount) {
        await this.upsertSubscriptionAmount(manager, subscription.id, input.amountEffectiveDate, input.amount)
        await this.deleteTransactionsAfterDateWithManager(manager, subscription.id, input.amountEffectiveDate)
      }
      await this.ensureSubscriptionDates(manager, [subscription], input.ensureDatesThroughDate)

      return manager.findOne(SubscriptionEntity, {
        where: {
          id: subscription.id,
          householdId
        },
        relations: {
          amounts: true,
          dates: true,
          user: true
        }
      })
    })
  }

  async delete(householdId: string, subscriptionId: string) {
    const result = await this.subscriptionsRepository.delete({
      id: subscriptionId,
      householdId
    })

    return Boolean(result.affected)
  }

  findByIdAndHouseholdId(subscriptionId: string, householdId: string) {
    return this.subscriptionsRepository.findOne({
      where: {
        id: subscriptionId,
        householdId
      },
      relations: {
        amounts: true,
        dates: true,
        user: true
      }
    })
  }

  async hasTransactions(subscriptionId: string) {
    const count = await this.subscriptionTransactionsRepository.count({
      where: {
        subscriptionId
      }
    })

    return count > 0
  }

  async deleteTransactionsAfterDate(subscriptionId: string, date: string) {
    const result = await this.subscriptionTransactionsRepository.delete({
      subscriptionId,
      date: MoreThan(date)
    })

    return result.affected || 0
  }

  async deleteSubscriptionDatesAfterDate(subscriptionId: string, date: string) {
    const result = await this.subscriptionDatesRepository.delete({
      subscriptionId,
      date: MoreThan(date)
    })

    return result.affected || 0
  }

  async ensureActiveMonthSubscriptionDates(referenceDate: string) {
    const monthEndDate = getMonthEndDate(referenceDate)

    return this.subscriptionsRepository.manager.transaction(async (manager) => {
      const subscriptions = await manager.find(SubscriptionEntity, {
        where: {},
        relations: {
          dates: true
        }
      })
      const monthStartDate = getMonthStartDate(referenceDate)
      const activeSubscriptions = subscriptions.filter((subscription) => {
        return subscription.startDate <= monthEndDate
          && (!subscription.endDate || subscription.endDate >= monthStartDate)
      })

      return this.ensureSubscriptionDates(manager, activeSubscriptions, monthEndDate)
    })
  }

  listSubscriptionTransactionsByHouseholdIdAndDateRange(householdId: string, startDate: string, endDate: string) {
    return orderSubscriptionTransactions(this.subscriptionTransactionsRepository
      .createQueryBuilder('subscriptionTransaction')
      .innerJoin('subscriptionTransaction.subscription', 'subscription')
      .where('subscription.household_id = :householdId', { householdId })
      .andWhere('subscriptionTransaction.date >= :startDate', { startDate })
      .andWhere('subscriptionTransaction.date <= :endDate', { endDate }))
      .getMany()
  }

  listSubscriptionTransactionsByUserIdAndDateRange(userId: string, startDate: string, endDate: string) {
    return orderSubscriptionTransactions(this.subscriptionTransactionsRepository
      .createQueryBuilder('subscriptionTransaction')
      .innerJoin('subscriptionTransaction.subscription', 'subscription')
      .where('subscription.user_id = :userId', { userId })
      .andWhere('subscriptionTransaction.date >= :startDate', { startDate })
      .andWhere('subscriptionTransaction.date <= :endDate', { endDate }))
      .getMany()
  }

  findSubscriptionTransactionByIdAndDateRange(
    transactionId: string,
    householdId: string,
    startDate: string,
    endDate: string,
    userId?: string
  ) {
    const query = this.subscriptionTransactionsRepository
      .createQueryBuilder('subscriptionTransaction')
      .innerJoin('subscriptionTransaction.subscription', 'subscription')
      .where('subscriptionTransaction.id = :transactionId', { transactionId })
      .andWhere('subscription.household_id = :householdId', { householdId })
      .andWhere('subscriptionTransaction.date >= :startDate', { startDate })
      .andWhere('subscriptionTransaction.date <= :endDate', { endDate })

    if (userId) {
      query.andWhere('subscription.user_id = :userId', { userId })
    }

    return query.getOne()
  }

  async createSubscriptionTransaction(input: CreateSubscriptionTransactionInput) {
    return this.subscriptionTransactionsRepository.manager.transaction(async (manager) => {
      const existingTransaction = await manager
        .getRepository(SubscriptionTransactionEntity)
        .createQueryBuilder('subscriptionTransaction')
        .where('subscriptionTransaction.subscription_id = :subscriptionId', { subscriptionId: input.subscriptionId })
        .andWhere('subscriptionTransaction.date = :date', { date: input.date })
        .getOne()

      if (existingTransaction) {
        return existingTransaction
      }

      const subscriptionTransaction = await manager.save(SubscriptionTransactionEntity, manager.create(SubscriptionTransactionEntity, {
        amount: input.amount,
        date: input.date,
        subscriptionId: input.subscriptionId,
        userId: input.userId
      }))

      return subscriptionTransaction
    })
  }

  async deleteSubscriptionTransaction(transactionId: string) {
    return this.subscriptionTransactionsRepository.manager.transaction(async (manager) => {
      const result = await manager.delete(SubscriptionTransactionEntity, transactionId)

      return Boolean(result.affected)
    })
  }

  private async upsertSubscriptionAmount(manager: EntityManager, subscriptionId: string, date: string, amount: number) {
    await manager
      .createQueryBuilder()
      .insert()
      .into(SubscriptionAmountEntity)
      .values({
        amount,
        date,
        subscriptionId
      })
      .orUpdate(['amount'], ['subscription_id', 'date'])
      .execute()
  }

  private async deleteTransactionsAfterDateWithManager(manager: EntityManager, subscriptionId: string, date: string) {
    await manager.delete(SubscriptionTransactionEntity, {
      subscriptionId,
      date: MoreThan(date)
    })
  }

  private async ensureSubscriptionDates(manager: EntityManager, subscriptions: SubscriptionEntity[], throughDate: string) {
    const values = subscriptions.flatMap((subscription) => {
      return buildMissingSubscriptionDates(subscription, throughDate).map(date => ({
        date,
        subscriptionId: subscription.id
      }))
    })

    if (!values.length) {
      return 0
    }

    const result = await manager
      .createQueryBuilder()
      .insert()
      .into(SubscriptionDateEntity)
      .values(values)
      .orIgnore()
      .execute()

    return result.identifiers.length
  }
}

function joinSubscriptionDetails(query: SelectQueryBuilder<SubscriptionEntity>) {
  return query
    .leftJoinAndSelect('subscription.amounts', 'subscriptionAmount')
    .leftJoinAndSelect('subscription.dates', 'subscriptionDate')
}

function orderSubscriptions(query: SelectQueryBuilder<SubscriptionEntity>) {
  return query
    .orderBy('EXTRACT(DAY FROM subscription.start_date)', 'ASC')
    .addOrderBy('subscription.start_date', 'ASC')
    .addOrderBy('subscription.name', 'ASC')
    .addOrderBy('subscription.created_at', 'ASC')
}

function orderSubscriptionTransactions(query: SelectQueryBuilder<SubscriptionTransactionEntity>) {
  return query
    .orderBy('subscriptionTransaction.date', 'ASC')
    .addOrderBy('subscriptionTransaction.created_at', 'ASC')
}

function buildMissingSubscriptionDates(subscription: SubscriptionEntity, throughDate: string) {
  const dates: string[] = []
  const existingDates = (subscription.dates || []).map(date => date.date).sort()
  let candidateDate = existingDates.length ? getNextSubscriptionDate(subscription.type, existingDates[existingDates.length - 1]!) : subscription.startDate

  while (candidateDate <= throughDate) {
    if (!subscription.endDate || candidateDate <= subscription.endDate) {
      dates.push(candidateDate)
    }

    candidateDate = getNextSubscriptionDate(subscription.type, candidateDate)
  }

  return dates
}

function getNextSubscriptionDate(type: SubscriptionType, date: string) {
  const parts = parseDateParts(date)

  if (type === SubscriptionType.Yearly) {
    return formatUtcDate(getClampedUtcDate(parts.year + 1, parts.month, parts.day))
  }

  const monthStart = new Date(Date.UTC(parts.year, parts.month, 1))

  return formatUtcDate(getClampedUtcDate(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, parts.day))
}

function getClampedUtcDate(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

  return new Date(Date.UTC(year, month - 1, Math.min(day, lastDay)))
}

function getMonthEndDate(date: string) {
  const parts = parseDateParts(date)

  return formatUtcDate(new Date(Date.UTC(parts.year, parts.month, 0)))
}

function getMonthStartDate(date: string) {
  const parts = parseDateParts(date)

  return `${parts.year}-${String(parts.month).padStart(2, '0')}-01`
}

function shouldUpsertSubscriptionAmount(amounts: SubscriptionAmountEntity[], effectiveDate: string, amount: number) {
  const currentAmount = getEffectiveSubscriptionAmount(amounts, effectiveDate)

  return currentAmount === null || Number(currentAmount).toFixed(2) !== Number(amount).toFixed(2)
}

function getEffectiveSubscriptionAmount(amounts: SubscriptionAmountEntity[], date: string) {
  const sortedAmounts = [...amounts].sort((first, second) => first.date.localeCompare(second.date))
  let effectiveAmount: number | null = null

  for (const amount of sortedAmounts) {
    if (amount.date > date) {
      break
    }

    effectiveAmount = amount.amount
  }

  return effectiveAmount ?? sortedAmounts[0]?.amount ?? null
}

function parseDateParts(date: string) {
  const [year, month, day] = date.split('-').map(Number)

  return {
    year,
    month,
    day
  }
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

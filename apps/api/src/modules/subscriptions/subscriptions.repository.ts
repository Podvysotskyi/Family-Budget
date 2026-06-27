import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, MoreThan, type SelectQueryBuilder, type Repository } from 'typeorm'
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
    @InjectRepository(SubscriptionTransactionEntity)
    private readonly subscriptionTransactionsRepository: Repository<SubscriptionTransactionEntity>
  ) {}

  listByHouseholdId(householdId: string) {
    return orderSubscriptions(this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .where('subscription.household_id = :householdId', { householdId }))
      .getMany()
  }

  listByHouseholdIdAndDateRange(householdId: string, startDate: string, endDate: string) {
    return orderSubscriptions(this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .where('subscription.household_id = :householdId', { householdId })
      .andWhere('subscription.start_date <= :endDate', { endDate })
      .andWhere('(subscription.end_date IS NULL OR subscription.end_date >= :startDate)', { startDate }))
      .getMany()
  }

  listByUserIdAndDateRange(userId: string, startDate: string, endDate: string) {
    return orderSubscriptions(this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .where('subscription.user_id = :userId', { userId })
      .andWhere('subscription.start_date <= :endDate', { endDate })
      .andWhere('(subscription.end_date IS NULL OR subscription.end_date >= :startDate)', { startDate }))
      .getMany()
  }

  listAutopayDueByDate(date: string) {
    return orderSubscriptions(this.subscriptionsRepository
      .createQueryBuilder('subscription')
      .where('subscription.autopay = true')
      .andWhere('subscription.start_date <= :date', { date })
      .andWhere('(subscription.end_date IS NULL OR subscription.end_date >= :date)', { date })
      .andWhere(new Brackets((query) => {
        query
          .where('subscription.type = :monthlyType AND EXTRACT(DAY FROM subscription.start_date) = EXTRACT(DAY FROM CAST(:date AS date))', {
            date,
            monthlyType: SubscriptionType.Monthly
          })
          .orWhere(
            'subscription.type = :yearlyType AND EXTRACT(MONTH FROM subscription.start_date) = EXTRACT(MONTH FROM CAST(:date AS date)) AND EXTRACT(DAY FROM subscription.start_date) = EXTRACT(DAY FROM CAST(:date AS date))',
            {
              date,
              yearlyType: SubscriptionType.Yearly
            }
          )
      })))
      .getMany()
  }

  create(input: SaveSubscriptionInput) {
    return this.subscriptionsRepository.save(this.subscriptionsRepository.create(input))
  }

  async update(householdId: string, subscriptionId: string, input: Omit<SaveSubscriptionInput, 'householdId'>) {
    const subscription = await this.subscriptionsRepository.findOne({
      where: {
        id: subscriptionId,
        householdId
      }
    })

    if (!subscription) {
      return null
    }

    this.subscriptionsRepository.merge(subscription, input)

    await this.subscriptionsRepository.save(subscription)

    return this.findByIdAndHouseholdId(subscription.id, householdId)
  }

  async endAndCreateReplacement(
    householdId: string,
    subscriptionId: string,
    currentEndDate: string,
    replacementInput: SaveSubscriptionInput
  ) {
    return this.subscriptionsRepository.manager.transaction(async (manager) => {
      const subscription = await manager.findOne(SubscriptionEntity, {
        where: {
          id: subscriptionId,
          householdId
        }
      })

      if (!subscription) {
        return null
      }

      manager.merge(SubscriptionEntity, subscription, {
        endDate: currentEndDate
      })

      await manager.save(SubscriptionEntity, subscription)

      await manager.delete(SubscriptionTransactionEntity, {
        subscriptionId,
        date: MoreThan(currentEndDate)
      })

      const replacement = await manager.save(SubscriptionEntity, manager.create(SubscriptionEntity, replacementInput))

      return manager.findOne(SubscriptionEntity, {
        where: {
          id: replacement.id,
          householdId
        },
        relations: {
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

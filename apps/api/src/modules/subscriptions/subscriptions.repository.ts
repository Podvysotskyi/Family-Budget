import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { SelectQueryBuilder, Repository } from 'typeorm'
import { BudgetSubscriptionTransactionEntity } from './entities/budget-subscription-transaction.entity'
import { SubscriptionTransactionEntity } from './entities/subscription-transaction.entity'
import { SubscriptionEntity } from './entities/subscription.entity'
import type { SubscriptionType } from './entities/subscription-type'

export interface SaveSubscriptionInput {
  householdId: string
  name: string
  userId: string | null
  type: SubscriptionType
  startDate: string
  endDate: string | null
  amount: number
}

export interface CreateSubscriptionTransactionInput {
  amount: number
  budgetIds: string[]
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

  listSubscriptionTransactionsByBudgetId(budgetId: string, userId?: string) {
    const query = this.subscriptionTransactionsRepository
      .createQueryBuilder('subscriptionTransaction')
      .innerJoin(
        BudgetSubscriptionTransactionEntity,
        'budgetSubscriptionTransaction',
        'budgetSubscriptionTransaction.subscription_transaction_id = subscriptionTransaction.id'
      )
      .innerJoin('subscriptionTransaction.subscription', 'subscription')
      .where('budgetSubscriptionTransaction.budget_id = :budgetId', { budgetId })
      .orderBy('subscriptionTransaction.created_at', 'ASC')

    if (userId) {
      query.andWhere('subscription.user_id = :userId', { userId })
    }

    return query.getMany()
  }

  async createSubscriptionTransaction(input: CreateSubscriptionTransactionInput) {
    const budgetIds = [...new Set(input.budgetIds)]

    return this.subscriptionTransactionsRepository.manager.transaction(async (manager) => {
      const existingTransaction = await manager
        .getRepository(SubscriptionTransactionEntity)
        .createQueryBuilder('subscriptionTransaction')
        .innerJoin(
          BudgetSubscriptionTransactionEntity,
          'budgetSubscriptionTransaction',
          'budgetSubscriptionTransaction.subscription_transaction_id = subscriptionTransaction.id'
        )
        .where('subscriptionTransaction.subscription_id = :subscriptionId', { subscriptionId: input.subscriptionId })
        .andWhere('budgetSubscriptionTransaction.budget_id IN (:...budgetIds)', { budgetIds })
        .getOne()

      if (existingTransaction) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(BudgetSubscriptionTransactionEntity)
          .values(budgetIds.map(budgetId => ({
            budgetId,
            subscriptionTransactionId: existingTransaction.id
          })))
          .orIgnore()
          .execute()

        return existingTransaction
      }

      const subscriptionTransaction = await manager.save(SubscriptionTransactionEntity, manager.create(SubscriptionTransactionEntity, {
        amount: input.amount,
        subscriptionId: input.subscriptionId,
        userId: input.userId
      }))

      await manager
        .createQueryBuilder()
        .insert()
        .into(BudgetSubscriptionTransactionEntity)
        .values(budgetIds.map(budgetId => ({
          budgetId,
          subscriptionTransactionId: subscriptionTransaction.id
        })))
        .orIgnore()
        .execute()

      return subscriptionTransaction
    })
  }

  async deleteSubscriptionTransactionByBudgetId(transactionId: string, budgetId: string, userId?: string) {
    return this.subscriptionTransactionsRepository.manager.transaction(async (manager) => {
      const query = manager
        .getRepository(SubscriptionTransactionEntity)
        .createQueryBuilder('subscriptionTransaction')
        .innerJoin(
          BudgetSubscriptionTransactionEntity,
          'budgetSubscriptionTransaction',
          'budgetSubscriptionTransaction.subscription_transaction_id = subscriptionTransaction.id'
        )
        .innerJoin('subscriptionTransaction.subscription', 'subscription')
        .where('subscriptionTransaction.id = :transactionId', { transactionId })
        .andWhere('budgetSubscriptionTransaction.budget_id = :budgetId', { budgetId })

      if (userId) {
        query.andWhere('subscription.user_id = :userId', { userId })
      }

      const subscriptionTransaction = await query.getOne()

      if (!subscriptionTransaction) {
        return false
      }

      await manager.delete(SubscriptionTransactionEntity, subscriptionTransaction.id)

      return true
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

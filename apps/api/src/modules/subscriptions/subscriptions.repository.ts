import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { Repository } from 'typeorm'
import { SubscriptionEntity } from './entities/subscription.entity'
import type { SubscriptionType } from './entities/subscription-type'

export interface SaveSubscriptionInput {
  householdId: string
  name: string
  userId: string | null
  parentId: string | null
  type: SubscriptionType
  startDate: string
  endDate: string | null
  amount: number
}

@Injectable()
export class SubscriptionsRepository {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionsRepository: Repository<SubscriptionEntity>
  ) {}

  listByHouseholdId(householdId: string) {
    return this.subscriptionsRepository.find({
      where: {
        householdId
      },
      relations: {
        user: true
      },
      order: {
        name: 'ASC',
        startDate: 'ASC',
        createdAt: 'ASC'
      }
    })
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
}

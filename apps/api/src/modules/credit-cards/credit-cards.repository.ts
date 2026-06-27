import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { Repository } from 'typeorm'
import { CreditCardLimitEntity } from './entities/credit-card-limit.entity'
import { CreditCardEntity } from './entities/credit-card.entity'

export interface SaveCreditCardInput {
  householdId: string
  userId: string | null
  name: string
  startDate: string
  endDate: string | null
  dueDate: string
}

export interface SaveCreditCardLimitInput {
  creditCardId: string
  date: string
  limit: number
}

@Injectable()
export class CreditCardsRepository {
  constructor(
    @InjectRepository(CreditCardEntity)
    private readonly creditCardsRepository: Repository<CreditCardEntity>,
    @InjectRepository(CreditCardLimitEntity)
    private readonly creditCardLimitsRepository: Repository<CreditCardLimitEntity>
  ) {}

  listByHouseholdId(householdId: string) {
    return this.creditCardsRepository
      .createQueryBuilder('creditCard')
      .leftJoinAndSelect('creditCard.user', 'user')
      .leftJoinAndSelect('creditCard.limits', 'limits')
      .where('creditCard.household_id = :householdId', { householdId })
      .orderBy('creditCard.name', 'ASC')
      .addOrderBy('creditCard.id', 'ASC')
      .addOrderBy('limits.date', 'DESC')
      .getMany()
  }

  async create(cardInput: SaveCreditCardInput, limitInput: Omit<SaveCreditCardLimitInput, 'creditCardId'>) {
    return this.creditCardsRepository.manager.transaction(async (manager) => {
      const creditCard = await manager.save(CreditCardEntity, manager.create(CreditCardEntity, cardInput))

      await manager
        .getRepository(CreditCardLimitEntity)
        .upsert(
          manager.create(CreditCardLimitEntity, {
            creditCardId: creditCard.id,
            ...limitInput
          }),
          {
            conflictPaths: ['creditCardId', 'date']
          }
        )

      return manager.findOne(CreditCardEntity, {
        where: {
          id: creditCard.id,
          householdId: cardInput.householdId
        },
        relations: {
          limits: true,
          user: true
        }
      })
    })
  }

  async update(householdId: string, creditCardId: string, cardInput: Omit<SaveCreditCardInput, 'householdId'>, limitInput: Omit<SaveCreditCardLimitInput, 'creditCardId'>) {
    return this.creditCardsRepository.manager.transaction(async (manager) => {
      const creditCard = await manager.findOne(CreditCardEntity, {
        where: {
          id: creditCardId,
          householdId
        }
      })

      if (!creditCard) {
        return null
      }

      manager.merge(CreditCardEntity, creditCard, cardInput)
      await manager.save(CreditCardEntity, creditCard)
      await manager
        .getRepository(CreditCardLimitEntity)
        .upsert(
          manager.create(CreditCardLimitEntity, {
            creditCardId,
            ...limitInput
          }),
          {
            conflictPaths: ['creditCardId', 'date']
          }
        )

      return manager.findOne(CreditCardEntity, {
        where: {
          id: creditCard.id,
          householdId
        },
        relations: {
          limits: true,
          user: true
        }
      })
    })
  }

  async end(householdId: string, creditCardId: string, endDate: string) {
    const creditCard = await this.creditCardsRepository.findOne({
      where: {
        id: creditCardId,
        householdId
      }
    })

    if (!creditCard) {
      return null
    }

    creditCard.endDate = endDate
    await this.creditCardsRepository.save(creditCard)

    return creditCard
  }

  findByIdAndHouseholdId(creditCardId: string, householdId: string) {
    return this.creditCardsRepository.findOne({
      where: {
        id: creditCardId,
        householdId
      },
      relations: {
        limits: true,
        user: true
      }
    })
  }
}

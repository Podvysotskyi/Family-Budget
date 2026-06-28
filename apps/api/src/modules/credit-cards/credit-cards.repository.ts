import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { Repository } from 'typeorm'
import { CreditCardBalanceEntity } from './entities/credit-card-balance.entity'
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

export interface UpdateCreditCardBalanceInput {
  creditCardId: string
  date: string
  balance: number
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
      .leftJoinAndSelect('creditCard.balances', 'balances')
      .where('creditCard.household_id = :householdId', { householdId })
      .orderBy('creditCard.name', 'ASC')
      .addOrderBy('creditCard.id', 'ASC')
      .addOrderBy('limits.date', 'DESC')
      .addOrderBy('balances.date', 'DESC')
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
      await manager
        .getRepository(CreditCardBalanceEntity)
        .upsert(
          manager.create(CreditCardBalanceEntity, {
            creditCardId: creditCard.id,
            date: limitInput.date,
            balance: 0
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
          balances: true,
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

      creditCard.name = cardInput.name
      creditCard.userId = cardInput.userId
      creditCard.startDate = cardInput.startDate
      creditCard.endDate = cardInput.endDate
      creditCard.dueDate = cardInput.dueDate
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
          balances: true,
          limits: true,
          user: true
        }
      })
    })
  }

  async cancel(householdId: string, creditCardId: string, endDate: string) {
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

      creditCard.endDate = endDate
      await manager.save(CreditCardEntity, creditCard)
      await manager.getRepository(CreditCardLimitEntity)
        .createQueryBuilder()
        .delete()
        .from(CreditCardLimitEntity)
        .where('credit_card_id = :creditCardId', { creditCardId })
        .andWhere('date > :endDate', { endDate })
        .execute()
      await manager.getRepository(CreditCardBalanceEntity)
        .createQueryBuilder()
        .delete()
        .from(CreditCardBalanceEntity)
        .where('credit_card_id = :creditCardId', { creditCardId })
        .andWhere('date > :endDate', { endDate })
        .execute()

      return manager.findOne(CreditCardEntity, {
        where: {
          id: creditCardId,
          householdId
        },
        relations: {
          balances: true,
          limits: true,
          user: true
        }
      })
    })
  }

  async updateBalance(input: UpdateCreditCardBalanceInput) {
    await this.creditCardsRepository.manager
      .getRepository(CreditCardBalanceEntity)
      .upsert(
        this.creditCardsRepository.manager.create(CreditCardBalanceEntity, input),
        {
          conflictPaths: ['creditCardId', 'date']
        }
      )

    return this.creditCardsRepository.manager.findOne(CreditCardBalanceEntity, {
      where: {
        creditCardId: input.creditCardId,
        date: input.date
      }
    })
  }

  findByIdAndHouseholdId(creditCardId: string, householdId: string) {
    return this.creditCardsRepository.findOne({
      where: {
        id: creditCardId,
        householdId
      },
      relations: {
        balances: true,
        limits: true,
        user: true
      }
    })
  }
}

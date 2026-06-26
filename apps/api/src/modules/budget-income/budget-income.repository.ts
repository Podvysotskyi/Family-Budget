import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { Repository } from 'typeorm'
import { BudgetIncomeEntity } from './entities/budget-income.entity'

export interface CreateBudgetIncomeDto {
  amount: number
  budgetId: string
  date: string | null
  incomeTypeId: string
  userId: string
}

@Injectable()
export class BudgetIncomeRepository {
  constructor(
    @InjectRepository(BudgetIncomeEntity)
    private readonly budgetIncomeRepository: Repository<BudgetIncomeEntity>
  ) {}

  create(input: CreateBudgetIncomeDto) {
    return this.budgetIncomeRepository.save(this.budgetIncomeRepository.create(input))
  }

  listByBudgetIdAndUserId(budgetId: string, userId: string) {
    return this.budgetIncomeRepository.find({
      where: {
        budgetId,
        userId
      },
      relations: {
        incomeType: true
      },
      order: {
        date: 'ASC',
        createdAt: 'ASC'
      }
    })
  }
}

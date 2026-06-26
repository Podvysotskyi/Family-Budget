import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { Repository } from 'typeorm'
import { BudgetCategoryEntity } from '../budget-categories/entities/budget-category.entity'
import { defaultBudgetCategoryNames } from '../budget-categories/default-budget-categories'
import { IncomeTypeEntity } from '../income-types/entities/income-type.entity'
import { defaultIncomeTypeTexts } from '../income-types/default-income-types'
import type { CreateHouseholdDto } from './dto/create-household.dto'
import { HouseholdEntity } from './entities/household.entity'

@Injectable()
export class HouseholdsRepository {
  constructor(
    @InjectRepository(HouseholdEntity)
    private readonly householdsRepository: Repository<HouseholdEntity>
  ) {}

  async create(input: CreateHouseholdDto) {
    return this.householdsRepository.manager.transaction(async (manager) => {
      const household = await manager.save(HouseholdEntity, manager.create(HouseholdEntity, input))

      await manager.save(BudgetCategoryEntity, defaultBudgetCategoryNames.map((name, index) => manager.create(BudgetCategoryEntity, {
        householdId: household.id,
        name,
        order: index + 1
      })))

      await manager.save(IncomeTypeEntity, defaultIncomeTypeTexts.map(text => manager.create(IncomeTypeEntity, {
        householdId: household.id,
        text
      })))

      return household
    })
  }

  async listIds() {
    const households = await this.householdsRepository.find({
      select: {
        id: true
      }
    })

    return households.map(household => household.id)
  }

  async updateName(householdId: string, name: string) {
    const household = await this.householdsRepository.findOne({
      where: { id: householdId }
    })

    if (!household) {
      return null
    }

    this.householdsRepository.merge(household, { name })

    return this.householdsRepository.save(household)
  }
}

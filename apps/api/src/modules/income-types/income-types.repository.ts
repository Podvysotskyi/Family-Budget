import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { Repository } from 'typeorm'
import { IncomeTypeEntity } from './entities/income-type.entity'

@Injectable()
export class IncomeTypesRepository {
  constructor(
    @InjectRepository(IncomeTypeEntity)
    private readonly incomeTypesRepository: Repository<IncomeTypeEntity>
  ) {}

  listByHouseholdId(householdId: string) {
    return this.incomeTypesRepository.find({
      where: {
        householdId
      },
      order: {
        text: 'ASC',
        createdAt: 'ASC'
      }
    })
  }

  create(householdId: string, text: string) {
    return this.incomeTypesRepository.save(this.incomeTypesRepository.create({
      householdId,
      text
    }))
  }

  findByIdAndHouseholdId(incomeTypeId: string, householdId: string) {
    return this.incomeTypesRepository.findOne({
      where: {
        id: incomeTypeId,
        householdId
      }
    })
  }

  async updateText(householdId: string, incomeTypeId: string, text: string) {
    const incomeType = await this.incomeTypesRepository.findOne({
      where: {
        id: incomeTypeId,
        householdId
      }
    })

    if (!incomeType) {
      return null
    }

    this.incomeTypesRepository.merge(incomeType, { text })

    return this.incomeTypesRepository.save(incomeType)
  }

  async delete(householdId: string, incomeTypeId: string) {
    const result = await this.incomeTypesRepository.delete({
      id: incomeTypeId,
      householdId
    })

    return Boolean(result.affected)
  }
}

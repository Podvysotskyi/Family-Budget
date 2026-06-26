import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, type Repository } from 'typeorm'
import { IncomeEntity } from './entities/income.entity'

export interface CreateIncomeDto {
  amount: number
  date: string
  incomeTypeId: string
  userId: string
}

@Injectable()
export class IncomeRepository {
  constructor(
    @InjectRepository(IncomeEntity)
    private readonly incomeRepository: Repository<IncomeEntity>
  ) {}

  create(input: CreateIncomeDto) {
    return this.incomeRepository.save(this.incomeRepository.create(input))
  }

  listByUserIdAndDateRange(userId: string, startDate: string, endDate: string) {
    return this.incomeRepository.find({
      where: {
        date: Between(startDate, endDate),
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

  listByHouseholdIdAndDateRange(householdId: string, startDate: string, endDate: string) {
    return this.incomeRepository
      .createQueryBuilder('income')
      .innerJoin('income.user', 'user', 'user.household_id = :householdId', { householdId })
      .leftJoinAndSelect('income.incomeType', 'incomeType')
      .where('income.date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('income.date', 'ASC')
      .addOrderBy('income.createdAt', 'ASC')
      .getMany()
  }
}

import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, type Repository } from 'typeorm'
import type { EnsureBudgetDto } from './dto/ensure-budget.dto'
import { BudgetType } from './entities/budget-type'
import { BudgetEntity } from './entities/budget.entity'

@Injectable()
export class BudgetsRepository {
  constructor(
    @InjectRepository(BudgetEntity)
    private readonly budgetsRepository: Repository<BudgetEntity>
  ) {}

  async ensureBudgets(inputs: EnsureBudgetDto[]) {
    if (!inputs.length) {
      return 0
    }

    const existingBudgets = await this.budgetsRepository.find({
      select: {
        householdId: true,
        type: true,
        startDate: true
      },
      where: {
        householdId: In([...new Set(inputs.map(input => input.householdId))]),
        startDate: In([...new Set(inputs.map(input => input.startDate))])
      }
    })
    const existingKeys = new Set(existingBudgets.map(budget => getBudgetKey(budget)))
    const missingInputs = inputs.filter(input => !existingKeys.has(getBudgetKey(input)))

    if (!missingInputs.length) {
      return 0
    }

    const activeDate = getCurrentDateInTimeZone()
    const result = await this.budgetsRepository
      .createQueryBuilder()
      .insert()
      .into(BudgetEntity)
      .values(missingInputs.map(input => ({
        ...input,
        isActive: isBudgetActiveOnDate(input.startDate, input.endDate, activeDate)
      })))
      .orIgnore()
      .returning('id')
      .execute()

    return Array.isArray(result.raw) ? result.raw.length : result.identifiers.length
  }

  listByHouseholdIdAndStartDates(householdId: string, startDates: string[]) {
    return this.budgetsRepository.find({
      where: {
        householdId,
        startDate: In(startDates)
      },
      order: {
        type: 'ASC',
        startDate: 'ASC'
      }
    })
  }

  findByIdAndHouseholdId(id: string, householdId: string) {
    return this.budgetsRepository.findOne({
      where: {
        id,
        householdId
      }
    })
  }

  async syncActiveStates(referenceDate: string) {
    const result = await this.budgetsRepository.query<Array<{ id: string }>>(
      `
        UPDATE budgets
        SET is_active = CASE
          WHEN start_date <= $1::date AND end_date >= $1::date THEN true
          ELSE false
        END
        WHERE is_active IS DISTINCT FROM CASE
          WHEN start_date <= $1::date AND end_date >= $1::date THEN true
          ELSE false
        END
        RETURNING id
      `,
      [referenceDate]
    )

    return result.length
  }
}

function getBudgetKey(input: Pick<EnsureBudgetDto, 'householdId' | 'type' | 'startDate'>) {
  return `${input.householdId}:${input.type}:${input.startDate}`
}

export function toBudgetPeriod(budget: BudgetEntity) {
  return {
    id: budget.id,
    type: budget.type,
    startDate: budget.startDate,
    endDate: budget.endDate,
    isActive: budget.isActive
  }
}

export function sortBudgetPeriods(budgets: BudgetEntity[]) {
  return budgets.toSorted((left, right) => {
    if (left.type !== right.type) {
      return left.type === BudgetType.Month ? -1 : 1
    }

    return left.startDate.localeCompare(right.startDate)
  })
}

function isBudgetActiveOnDate(startDate: string, endDate: string, referenceDate: string) {
  return startDate <= referenceDate && endDate >= referenceDate
}

function getCurrentDateInTimeZone(timeZone = 'America/Chicago') {
  const resolvedTimeZone = process.env.SCHEDULING_TIMEZONE || timeZone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: resolvedTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())

  const year = parts.find(part => part.type === 'year')?.value
  const month = parts.find(part => part.type === 'month')?.value
  const day = parts.find(part => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Could not determine current budget date')
  }

  return `${year}-${month}-${day}`
}

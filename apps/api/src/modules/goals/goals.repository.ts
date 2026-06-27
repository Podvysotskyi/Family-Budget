import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { EntityManager, Repository } from 'typeorm'
import { GoalTargetEntity } from './entities/goal-target.entity'
import { GoalTransactionEntity } from './entities/goal-transaction.entity'
import { GoalEntity } from './entities/goal.entity'
import type { GoalTargetType } from './entities/goal-target-type'

export interface SaveGoalInput {
  householdId: string
  userId: string | null
  name: string
  startDate: string
  endDate: string | null
  includeInBudget: boolean
}

export interface SaveGoalTargetInput {
  amount: number
  date: string
  type: GoalTargetType
}

@Injectable()
export class GoalsRepository {
  constructor(
    @InjectRepository(GoalEntity)
    private readonly goalsRepository: Repository<GoalEntity>,
    @InjectRepository(GoalTransactionEntity)
    private readonly goalTransactionsRepository: Repository<GoalTransactionEntity>
  ) {}

  listByHouseholdId(householdId: string) {
    return this.goalsRepository
      .createQueryBuilder('goal')
      .leftJoinAndSelect('goal.user', 'user')
      .leftJoinAndSelect('goal.targets', 'target')
      .where('goal.household_id = :householdId', { householdId })
      .orderBy('goal.name', 'ASC')
      .addOrderBy('goal.id', 'ASC')
      .addOrderBy('target.date', 'DESC')
      .addOrderBy('target.id', 'DESC')
      .getMany()
  }

  create(goalInput: SaveGoalInput, targetInput: SaveGoalTargetInput) {
    return this.goalsRepository.manager.transaction(async (manager) => {
      const goal = await manager.save(GoalEntity, manager.create(GoalEntity, goalInput))

      await this.upsertGoalTarget(manager, goal.id, targetInput)

      return manager.findOne(GoalEntity, {
        where: {
          id: goal.id,
          householdId: goalInput.householdId
        },
        relations: {
          targets: true,
          user: true
        }
      })
    })
  }

  update(householdId: string, goalId: string, goalInput: Omit<SaveGoalInput, 'householdId'>, targetInput: SaveGoalTargetInput) {
    return this.goalsRepository.manager.transaction(async (manager) => {
      const goal = await manager.findOne(GoalEntity, {
        where: {
          id: goalId,
          householdId
        },
        relations: {
          targets: true
        }
      })

      if (!goal) {
        return null
      }

      manager.merge(GoalEntity, goal, goalInput)
      await manager.save(GoalEntity, goal)

      if (shouldUpsertGoalTarget(goal.targets || [], targetInput)) {
        await this.upsertGoalTarget(manager, goal.id, targetInput)
      }

      return manager.findOne(GoalEntity, {
        where: {
          id: goal.id,
          householdId
        },
        relations: {
          targets: true,
          user: true
        }
      })
    })
  }

  async end(householdId: string, goalId: string, endDate: string) {
    const goal = await this.goalsRepository.findOne({
      where: {
        id: goalId,
        householdId
      }
    })

    if (!goal) {
      return null
    }

    goal.endDate = endDate
    await this.goalsRepository.save(goal)

    return goal
  }

  async delete(householdId: string, goalId: string) {
    const result = await this.goalsRepository.delete({
      id: goalId,
      householdId
    })

    return Boolean(result.affected)
  }

  findByIdAndHouseholdId(goalId: string, householdId: string) {
    return this.goalsRepository.findOne({
      where: {
        id: goalId,
        householdId
      },
      relations: {
        targets: true,
        user: true
      }
    })
  }

  async hasTransactions(goalId: string) {
    const count = await this.goalTransactionsRepository.count({
      where: {
        goalId
      }
    })

    return count > 0
  }

  async countTransactions(goalId: string) {
    return this.goalTransactionsRepository.count({
      where: {
        goalId
      }
    })
  }

  private async upsertGoalTarget(manager: EntityManager, goalId: string, targetInput: SaveGoalTargetInput) {
    await manager
      .getRepository(GoalTargetEntity)
      .upsert(
        manager.getRepository(GoalTargetEntity).create({
          goalId,
          ...targetInput
        }),
        {
          conflictPaths: ['goalId', 'date']
        }
      )
  }
}

function shouldUpsertGoalTarget(targets: GoalTargetEntity[], targetInput: SaveGoalTargetInput) {
  const currentTarget = [...targets]
    .sort((first, second) => second.date.localeCompare(first.date) || second.id.localeCompare(first.id))[0]

  return !currentTarget
    || currentTarget.amount !== targetInput.amount
    || currentTarget.type !== targetInput.type
    || currentTarget.date === targetInput.date
}

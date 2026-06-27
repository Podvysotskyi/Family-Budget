import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { Repository } from 'typeorm'
import { BudgetCategoryEntity } from './entities/budget-category.entity'

export type BudgetCategoryReorderDirection = 'up' | 'down'
export type BudgetCategoryUpdateResult = BudgetCategoryEntity | 'not-found' | 'protected'
export type BudgetCategoryDeleteResult = 'deleted' | 'not-found' | 'protected'

@Injectable()
export class BudgetCategoriesRepository {
  constructor(
    @InjectRepository(BudgetCategoryEntity)
    private readonly budgetCategoriesRepository: Repository<BudgetCategoryEntity>
  ) {}

  listByHouseholdId(householdId: string) {
    return this.budgetCategoriesRepository.find({
      where: { householdId },
      order: {
        order: 'ASC',
        name: 'ASC',
        createdAt: 'ASC'
      }
    })
  }

  async create(householdId: string, name: string) {
    const order = await this.getNextOrder(householdId)

    return this.budgetCategoriesRepository.save(this.budgetCategoriesRepository.create({
      householdId,
      name,
      type: null,
      order
    }))
  }

  async updateName(householdId: string, categoryId: string, name: string): Promise<BudgetCategoryUpdateResult> {
    const category = await this.budgetCategoriesRepository.findOne({
      where: {
        id: categoryId,
        householdId
      }
    })

    if (!category) {
      return 'not-found'
    }

    if (category.type !== null) {
      return 'protected'
    }

    this.budgetCategoriesRepository.merge(category, { name })

    return this.budgetCategoriesRepository.save(category)
  }

  async reorder(householdId: string, categoryId: string, direction: BudgetCategoryReorderDirection) {
    const category = await this.budgetCategoriesRepository.findOne({
      where: {
        id: categoryId,
        householdId
      }
    })

    if (!category) {
      return null
    }

    const neighborOrder = direction === 'up' ? category.order - 1 : category.order + 1

    const neighbor = await this.budgetCategoriesRepository.findOne({
      where: {
        householdId,
        order: neighborOrder
      }
    })

    if (!neighbor) {
      return category
    }

    await this.budgetCategoriesRepository.manager.transaction(async (manager) => {
      await manager.update(BudgetCategoryEntity, { id: category.id }, { order: 0 })
      await manager.update(BudgetCategoryEntity, { id: neighbor.id }, { order: category.order })
      await manager.update(BudgetCategoryEntity, { id: category.id }, { order: neighbor.order })
    })

    return this.budgetCategoriesRepository.findOneByOrFail({ id: category.id })
  }

  async delete(householdId: string, categoryId: string): Promise<BudgetCategoryDeleteResult> {
    const category = await this.budgetCategoriesRepository.findOne({
      where: {
        id: categoryId,
        householdId
      }
    })

    if (!category) {
      return 'not-found'
    }

    if (category.type !== null) {
      return 'protected'
    }

    await this.budgetCategoriesRepository.manager.transaction(async (manager) => {
      await manager.delete(BudgetCategoryEntity, { id: category.id })
      await manager
        .createQueryBuilder()
        .update(BudgetCategoryEntity)
        .set({ order: () => '-"order"' })
        .where('"household_id" = :householdId', { householdId })
        .andWhere('"order" > :deletedOrder', { deletedOrder: category.order })
        .execute()
      await manager
        .createQueryBuilder()
        .update(BudgetCategoryEntity)
        .set({ order: () => 'ABS("order") - 1' })
        .where('"household_id" = :householdId', { householdId })
        .andWhere('"order" < 0')
        .execute()
    })

    return 'deleted'
  }

  private async getNextOrder(householdId: string) {
    const result = await this.budgetCategoriesRepository
      .createQueryBuilder('category')
      .select('COALESCE(MAX(category."order"), 0)', 'maxOrder')
      .where('category.household_id = :householdId', { householdId })
      .getRawOne<{ maxOrder: string | number }>()

    return Number(result?.maxOrder || 0) + 1
  }
}

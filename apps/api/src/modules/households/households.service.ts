import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { BudgetCategoriesRepository } from '../budget-categories/budget-categories.repository'
import type { BudgetCategoryReorderDirection } from '../budget-categories/budget-categories.repository'
import type { SaveBudgetCategoryDto } from '../budget-categories/dto/save-budget-category.dto'
import type { BudgetCategoryEntity } from '../budget-categories/entities/budget-category.entity'
import { buildBudgetInputsForMonth } from '../budgets/budget-windows'
import { BudgetsRepository, sortBudgetPeriods, toBudgetPeriod } from '../budgets/budgets.repository'
import { BudgetType } from '../budgets/entities/budget-type'
import type { SaveIncomeDto } from '../income/dto/save-income.dto'
import type { IncomeEntity } from '../income/entities/income.entity'
import { IncomeRepository } from '../income/income.repository'
import type { SaveIncomeTypeDto } from '../income-types/dto/save-income-type.dto'
import type { IncomeTypeEntity } from '../income-types/entities/income-type.entity'
import { IncomeTypesRepository } from '../income-types/income-types.repository'
import type { SaveSubscriptionDto } from '../subscriptions/dto/save-subscription.dto'
import type { SubscriptionEntity } from '../subscriptions/entities/subscription.entity'
import { SubscriptionType } from '../subscriptions/entities/subscription-type'
import { SubscriptionsRepository } from '../subscriptions/subscriptions.repository'
import { UsersRepository } from '../users/users.repository'
import type { UpdateHouseholdDto } from './dto/update-household.dto'
import { HouseholdsRepository } from './households.repository'

export interface BudgetMonthSelection {
  month: number
  year: number
}

const householdBudgetUserId = 'household'

@Injectable()
export class HouseholdService {
  constructor(
    @Inject(BudgetCategoriesRepository) private readonly budgetCategoriesRepository: BudgetCategoriesRepository,
    @Inject(BudgetsRepository) private readonly budgetsRepository: BudgetsRepository,
    @Inject(HouseholdsRepository) private readonly householdsRepository: HouseholdsRepository,
    @Inject(IncomeRepository) private readonly incomeRepository: IncomeRepository,
    @Inject(IncomeTypesRepository) private readonly incomeTypesRepository: IncomeTypesRepository,
    @Inject(SubscriptionsRepository) private readonly subscriptionsRepository: SubscriptionsRepository,
    @Inject(UsersRepository) private readonly usersRepository: UsersRepository
  ) {}

  async getDashboard(householdId: string, userId: string) {
    const household = await this.usersRepository.findHouseholdByHouseholdIdAndUserId(householdId, userId)

    if (!household) {
      throw new NotFoundException('Household not found')
    }

    const members = await this.usersRepository.listByHouseholdId(householdId)

    return {
      household,
      members
    }
  }

  async update(householdId: string, userId: string, input: UpdateHouseholdDto) {
    const currentUser = await this.usersRepository.findByHouseholdIdAndUserId(householdId, userId)

    if (!currentUser) {
      throw new NotFoundException('Household not found')
    }

    const name = typeof input?.name === 'string' ? input.name.trim() : ''

    if (!name) {
      throw new BadRequestException('Household name is required')
    }

    const household = await this.householdsRepository.updateName(householdId, name)

    if (!household) {
      throw new NotFoundException('Household not found')
    }

    return {
      household: {
        householdId: household.id,
        householdName: household.name
      }
    }
  }

  async getUserBudgetMonthPeriodForCurrentUser(
    currentUserId: string,
    budgetUserId: string,
    budgetMonth: BudgetMonthSelection
  ) {
    const household = await this.usersRepository.findHouseholdByUserId(currentUserId)

    if (!household) {
      throw new NotFoundException('Household not found')
    }

    const budgetHouseholdId = await this.getBudgetHouseholdId(household.householdId, currentUserId, budgetUserId)
    const budgets = await this.listBudgetPeriodEntitiesForMonth(budgetHouseholdId, budgetMonth)
    const selectedBudget = budgets.find(budget => budget.type === BudgetType.Month)

    if (!selectedBudget) {
      throw new NotFoundException('Budget period not found')
    }

    return toBudgetPeriodList(budgets)
  }

  async getUserBudgetWeekPeriodForCurrentUser(
    currentUserId: string,
    budgetUserId: string,
    budgetMonth: BudgetMonthSelection,
    startDate: string
  ) {
    const household = await this.usersRepository.findHouseholdByUserId(currentUserId)

    if (!household) {
      throw new NotFoundException('Household not found')
    }

    const budgetHouseholdId = await this.getBudgetHouseholdId(household.householdId, currentUserId, budgetUserId)
    const budgets = await this.listBudgetPeriodEntitiesForMonth(budgetHouseholdId, budgetMonth)
    const selectedBudget = budgets.find(budget => budget.type === BudgetType.Week && budget.startDate === startDate)

    if (!selectedBudget) {
      throw new NotFoundException('Budget period not found')
    }

    return {
      budget: toBudgetPeriod(selectedBudget)
    }
  }

  async listBudgetCategories(householdId: string, userId: string) {
    await this.requireHouseholdUser(householdId, userId)
    const categories = await this.budgetCategoriesRepository.listByHouseholdId(householdId)

    return {
      categories: categories.map(toBudgetCategory)
    }
  }

  async createBudgetCategory(householdId: string, userId: string, input: SaveBudgetCategoryDto) {
    await this.requireHouseholdUser(householdId, userId)
    const name = getBudgetCategoryName(input)
    const category = await this.budgetCategoriesRepository.create(householdId, name)

    return {
      category: toBudgetCategory(category)
    }
  }

  async listIncomeForCurrentUser(currentUserId: string, budgetUserId: string, budgetId: string) {
    const household = await this.usersRepository.findHouseholdByUserId(currentUserId)

    if (!household) {
      throw new NotFoundException('Household not found')
    }

    const budget = await this.requireBudgetForHousehold(budgetId, household.householdId)

    if (budgetUserId === householdBudgetUserId) {
      await this.requireHouseholdUser(household.householdId, currentUserId)

      return {
        incomes: (await this.incomeRepository.listByHouseholdIdAndDateRange(
          household.householdId,
          budget.startDate,
          budget.endDate
        )).map(toIncome)
      }
    }

    const budgetUser = await this.requireBudgetUser(household.householdId, currentUserId, budgetUserId)

    return {
      incomes: (await this.incomeRepository.listByUserIdAndDateRange(
        budgetUser.userId,
        budget.startDate,
        budget.endDate
      )).map(toIncome)
    }
  }

  async createIncomeForCurrentUser(currentUserId: string, budgetUserId: string, budgetId: string, input: SaveIncomeDto) {
    const household = await this.usersRepository.findHouseholdByUserId(currentUserId)

    if (!household) {
      throw new NotFoundException('Household not found')
    }

    const budget = await this.requireBudgetForHousehold(budgetId, household.householdId)

    if (budgetUserId === householdBudgetUserId) {
      throw new BadRequestException('Household income must be assigned to a household member')
    }

    const budgetUser = await this.requireBudgetUser(household.householdId, currentUserId, budgetUserId)
    const incomeTypeId = getIncomeTypeId(input)
    const incomeType = await this.incomeTypesRepository.findByIdAndHouseholdId(incomeTypeId, budgetUser.householdId)

    if (!incomeType) {
      throw new NotFoundException('Income type not found')
    }

    const income = await this.incomeRepository.create({
      incomeTypeId: incomeType.id,
      userId: budgetUser.userId,
      amount: getIncomeAmount(input),
      date: getIncomeDate(input, budget)
    })

    return {
      income: toIncome({
        ...income,
        incomeType
      } as IncomeEntity)
    }
  }

  async updateBudgetCategory(householdId: string, userId: string, categoryId: string, input: SaveBudgetCategoryDto) {
    await this.requireHouseholdUser(householdId, userId)
    const name = getBudgetCategoryName(input)
    const category = await this.budgetCategoriesRepository.updateName(householdId, categoryId, name)

    if (!category) {
      throw new NotFoundException('Budget category not found')
    }

    return {
      category: toBudgetCategory(category)
    }
  }

  async reorderBudgetCategory(householdId: string, userId: string, categoryId: string, direction: BudgetCategoryReorderDirection) {
    await this.requireHouseholdUser(householdId, userId)
    const category = await this.budgetCategoriesRepository.reorder(householdId, categoryId, direction)

    if (!category) {
      throw new NotFoundException('Budget category not found')
    }

    return {
      category: toBudgetCategory(category)
    }
  }

  async deleteBudgetCategory(householdId: string, userId: string, categoryId: string) {
    await this.requireHouseholdUser(householdId, userId)
    const deleted = await this.budgetCategoriesRepository.delete(householdId, categoryId)

    if (!deleted) {
      throw new NotFoundException('Budget category not found')
    }

    return {
      deleted: true
    }
  }

  async listIncomeTypes(householdId: string, userId: string) {
    await this.requireHouseholdUser(householdId, userId)
    const incomeTypes = await this.incomeTypesRepository.listByHouseholdId(householdId)

    return {
      incomeTypes: incomeTypes.map(toIncomeType)
    }
  }

  async createIncomeType(householdId: string, userId: string, input: SaveIncomeTypeDto) {
    await this.requireHouseholdUser(householdId, userId)
    const text = getIncomeTypeText(input)
    const incomeType = await this.incomeTypesRepository.create(householdId, text)

    return {
      incomeType: toIncomeType(incomeType)
    }
  }

  async updateIncomeType(householdId: string, userId: string, incomeTypeId: string, input: SaveIncomeTypeDto) {
    await this.requireHouseholdUser(householdId, userId)
    const text = getIncomeTypeText(input)
    const incomeType = await this.incomeTypesRepository.updateText(householdId, incomeTypeId, text)

    if (!incomeType) {
      throw new NotFoundException('Income type not found')
    }

    return {
      incomeType: toIncomeType(incomeType)
    }
  }

  async deleteIncomeType(householdId: string, userId: string, incomeTypeId: string) {
    await this.requireHouseholdUser(householdId, userId)
    const deleted = await this.incomeTypesRepository.delete(householdId, incomeTypeId)

    if (!deleted) {
      throw new NotFoundException('Income type not found')
    }

    return {
      deleted: true
    }
  }

  async listSubscriptions(householdId: string, userId: string) {
    await this.requireHouseholdUser(householdId, userId)
    const subscriptions = await this.subscriptionsRepository.listByHouseholdId(householdId)

    return {
      subscriptions: subscriptions.map(toSubscription)
    }
  }

  async createSubscription(householdId: string, userId: string, input: SaveSubscriptionDto) {
    await this.requireHouseholdUser(householdId, userId)
    const subscriptionUserId = await this.getSubscriptionUserId(householdId, input)

    if (subscriptionUserId && subscriptionUserId !== userId) {
      throw new ForbiddenException('Subscription can only be created for current user or household')
    }

    const subscription = await this.subscriptionsRepository.create({
      householdId,
      name: getSubscriptionName(input),
      userId: subscriptionUserId,
      type: getSubscriptionType(input),
      startDate: getSubscriptionStartDate(input),
      endDate: getSubscriptionEndDate(input),
      amount: getSubscriptionAmount(input)
    })

    const savedSubscription = await this.subscriptionsRepository.findByIdAndHouseholdId(subscription.id, householdId)

    return {
      subscription: toSubscription(savedSubscription || subscription)
    }
  }

  async updateSubscription(householdId: string, userId: string, subscriptionId: string, input: SaveSubscriptionDto) {
    await this.requireHouseholdUser(householdId, userId)
    const subscriptionUserId = await this.getSubscriptionUserId(householdId, input)
    const subscription = await this.subscriptionsRepository.update(householdId, subscriptionId, {
      name: getSubscriptionName(input),
      userId: subscriptionUserId,
      type: getSubscriptionType(input),
      startDate: getSubscriptionStartDate(input),
      endDate: getSubscriptionEndDate(input),
      amount: getSubscriptionAmount(input)
    })

    if (!subscription) {
      throw new NotFoundException('Subscription not found')
    }

    return {
      subscription: toSubscription(subscription)
    }
  }

  async deleteSubscription(householdId: string, userId: string, subscriptionId: string) {
    await this.requireHouseholdUser(householdId, userId)
    const deleted = await this.subscriptionsRepository.delete(householdId, subscriptionId)

    if (!deleted) {
      throw new NotFoundException('Subscription not found')
    }

    return {
      deleted: true
    }
  }

  private async getBudgetPeriodsForMonth(householdId: string, budgetMonth: BudgetMonthSelection) {
    return toBudgetPeriodList(await this.listBudgetPeriodEntitiesForMonth(householdId, budgetMonth))
  }

  private async listBudgetPeriodEntitiesForMonth(householdId: string, budgetMonth: BudgetMonthSelection) {
    const budgetInputs = buildBudgetInputsForMonth([householdId], budgetMonth.year, budgetMonth.month)

    await this.budgetsRepository.ensureBudgets(budgetInputs)

    const startDates = [...new Set(budgetInputs.map(input => input.startDate))]
    return sortBudgetPeriods(await this.budgetsRepository.listByHouseholdIdAndStartDates(householdId, startDates))
  }

  private async requireHouseholdUser(householdId: string, userId: string) {
    const currentUser = await this.usersRepository.findByHouseholdIdAndUserId(householdId, userId)

    if (!currentUser) {
      throw new NotFoundException('Household not found')
    }
  }

  private async requireBudgetUser(householdId: string, currentUserId: string, budgetUserId: string) {
    const currentUser = await this.usersRepository.findByHouseholdIdAndUserId(householdId, currentUserId)

    if (!currentUser) {
      throw new NotFoundException('Household not found')
    }

    const budgetUser = await this.usersRepository.findBudgetUserByHouseholdIdAndUserId(householdId, budgetUserId)

    if (!budgetUser) {
      throw new NotFoundException('Budget user not found')
    }

    return budgetUser
  }

  private async getBudgetHouseholdId(householdId: string, currentUserId: string, budgetUserId: string) {
    if (budgetUserId === householdBudgetUserId) {
      await this.requireHouseholdUser(householdId, currentUserId)

      return householdId
    }

    const budgetUser = await this.requireBudgetUser(householdId, currentUserId, budgetUserId)

    return budgetUser.householdId
  }

  private async getSubscriptionUserId(householdId: string, input: SaveSubscriptionDto) {
    const members = await this.usersRepository.listByHouseholdId(householdId)

    if (members.length === 1) {
      return members[0]!.userId
    }

    const userId = typeof input?.userId === 'string' && input.userId.trim() ? input.userId.trim() : null

    if (!userId) {
      return null
    }

    const user = await this.usersRepository.findByHouseholdIdAndUserId(householdId, userId)

    if (!user) {
      throw new NotFoundException('Subscription user not found')
    }

    return user.id
  }

  private async requireBudgetForHousehold(budgetId: string, householdId: string) {
    const budget = await this.budgetsRepository.findByIdAndHouseholdId(budgetId, householdId)

    if (!budget) {
      throw new NotFoundException('Budget not found')
    }

    return budget
  }
}

function getBudgetCategoryName(input: SaveBudgetCategoryDto) {
  const name = typeof input?.name === 'string' ? input.name.trim() : ''

  if (!name) {
    throw new BadRequestException('Budget category name is required')
  }

  return name
}

function getIncomeTypeText(input: SaveIncomeTypeDto) {
  const text = typeof input?.text === 'string' ? input.text.trim() : ''

  if (!text) {
    throw new BadRequestException('Income type text is required')
  }

  return text
}

function toBudgetCategory(category: BudgetCategoryEntity) {
  return {
    id: category.id,
    householdId: category.householdId,
    name: category.name,
    order: category.order,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt
  }
}

function toIncomeType(incomeType: IncomeTypeEntity) {
  return {
    id: incomeType.id,
    householdId: incomeType.householdId,
    text: incomeType.text,
    createdAt: incomeType.createdAt,
    updatedAt: incomeType.updatedAt
  }
}

function getSubscriptionName(input: SaveSubscriptionDto) {
  const name = typeof input?.name === 'string' ? input.name.trim() : ''

  if (!name) {
    throw new BadRequestException('Subscription name is required')
  }

  return name
}

function getSubscriptionType(input: SaveSubscriptionDto) {
  if (input?.type === SubscriptionType.Monthly || input?.type === SubscriptionType.Yearly) {
    return input.type
  }

  throw new BadRequestException('Subscription type must be monthly or yearly')
}

function getSubscriptionStartDate(input: SaveSubscriptionDto) {
  const startDate = typeof input?.startDate === 'string' ? input.startDate : ''

  if (!isDateString(startDate)) {
    throw new BadRequestException('Subscription start date must be in YYYY-MM-DD format')
  }

  return startDate
}

function getSubscriptionEndDate(input: SaveSubscriptionDto) {
  const endDate = typeof input?.endDate === 'string' && input.endDate ? input.endDate : null

  if (!endDate) {
    return null
  }

  if (!isDateString(endDate)) {
    throw new BadRequestException('Subscription end date must be in YYYY-MM-DD format')
  }

  const startDate = getSubscriptionStartDate(input)

  if (endDate < startDate) {
    throw new BadRequestException('Subscription end date must be on or after the start date')
  }

  return endDate
}

function getSubscriptionAmount(input: SaveSubscriptionDto) {
  const amount = Number(input?.amount)

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestException('Subscription amount must be greater than zero')
  }

  return amount
}

function isDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function toSubscription(subscription: SubscriptionEntity) {
  return {
    id: subscription.id,
    householdId: subscription.householdId,
    name: subscription.name,
    userId: subscription.userId,
    user: subscription.user
      ? {
          userId: subscription.user.id,
          name: subscription.user.name,
          email: subscription.user.email,
          avatarUrl: subscription.user.avatarUrl
        }
      : null,
    type: subscription.type,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    amount: subscription.amount,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt
  }
}

function toBudgetPeriodList(budgets: ReturnType<typeof sortBudgetPeriods>) {
  return {
    month: toBudgetPeriod(budgets.find(budget => budget.type === BudgetType.Month)!),
    weeks: budgets.filter(budget => budget.type === BudgetType.Week).map(toBudgetPeriod)
  }
}

function getIncomeTypeId(input: SaveIncomeDto) {
  if (typeof input?.incomeTypeId !== 'string' || !input.incomeTypeId) {
    throw new BadRequestException('Income type id is required')
  }

  return input.incomeTypeId
}

function getIncomeAmount(input: SaveIncomeDto) {
  const amount = Number(input?.amount)

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestException('Income amount must be greater than zero')
  }

  return amount
}

function getIncomeDate(input: SaveIncomeDto, budget: { startDate: string, endDate: string }) {
  const date = input?.date || budget.startDate

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException('Income date must be in YYYY-MM-DD format')
  }

  if (date < budget.startDate || date > budget.endDate) {
    throw new BadRequestException('Income date must be inside the budget period')
  }

  return date
}

function toIncome(income: IncomeEntity) {
  return {
    id: income.id,
    incomeTypeId: income.incomeTypeId,
    incomeTypeText: income.incomeType.text,
    userId: income.userId,
    amount: income.amount,
    date: income.date,
    createdAt: income.createdAt,
    updatedAt: income.updatedAt
  }
}

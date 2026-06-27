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
import type { CreateSubscriptionTransactionDto } from '../subscriptions/dto/create-subscription-transaction.dto'
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

export interface DateRangeSelection {
  fromDate: string
  toDate: string
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

  async listSubscriptionsForCurrentUser(currentUserId: string, budgetUserId: string, dateRange: DateRangeSelection) {
    const household = await this.usersRepository.findHouseholdByUserId(currentUserId)

    if (!household) {
      throw new NotFoundException('Household not found')
    }

    if (budgetUserId === householdBudgetUserId) {
      await this.requireHouseholdUser(household.householdId, currentUserId)

      return {
        subscriptions: (await this.subscriptionsRepository.listByHouseholdIdAndDateRange(
          household.householdId,
          dateRange.fromDate,
          dateRange.toDate
        ))
          .flatMap(subscription => toBudgetSubscriptions(subscription, dateRange.fromDate, dateRange.toDate))
          .sort(sortBudgetSubscriptions)
      }
    }

    const budgetUser = await this.requireBudgetUser(household.householdId, currentUserId, budgetUserId)

    return {
      subscriptions: (await this.subscriptionsRepository.listByUserIdAndDateRange(
        budgetUser.userId,
        dateRange.fromDate,
        dateRange.toDate
      ))
        .flatMap(subscription => toBudgetSubscriptions(subscription, dateRange.fromDate, dateRange.toDate))
        .sort(sortBudgetSubscriptions)
    }
  }

  async listBudgetTransactionsForCurrentUser(
    currentUserId: string,
    budgetUserId: string,
    budgetId: string,
    dateRange: DateRangeSelection
  ) {
    const household = await this.usersRepository.findHouseholdByUserId(currentUserId)

    if (!household) {
      throw new NotFoundException('Household not found')
    }

    await this.requireBudgetForHousehold(budgetId, household.householdId)

    if (budgetUserId === householdBudgetUserId) {
      await this.requireHouseholdUser(household.householdId, currentUserId)

      return {
        subscription_transactions: (await this.subscriptionsRepository.listSubscriptionTransactionsByHouseholdIdAndDateRange(
          household.householdId,
          dateRange.fromDate,
          dateRange.toDate
        )).map(toSubscriptionTransaction)
      }
    }

    const budgetUser = await this.requireBudgetUser(household.householdId, currentUserId, budgetUserId)

    return {
      subscription_transactions: (await this.subscriptionsRepository.listSubscriptionTransactionsByUserIdAndDateRange(
        budgetUser.userId,
        dateRange.fromDate,
        dateRange.toDate
      )).map(toSubscriptionTransaction)
    }
  }

  async createSubscriptionTransactionForCurrentUser(
    currentUserId: string,
    budgetUserId: string,
    budgetId: string,
    input: CreateSubscriptionTransactionDto
  ) {
    const household = await this.usersRepository.findHouseholdByUserId(currentUserId)

    if (!household) {
      throw new NotFoundException('Household not found')
    }

    const budget = await this.requireBudgetForHousehold(budgetId, household.householdId)
    const subscriptionId = getSubscriptionTransactionSubscriptionId(input)
    const subscription = await this.subscriptionsRepository.findByIdAndHouseholdId(subscriptionId, household.householdId)

    if (!subscription) {
      throw new NotFoundException('Subscription not found')
    }

    if (budgetUserId === householdBudgetUserId) {
      await this.requireHouseholdUser(household.householdId, currentUserId)
    } else {
      const budgetUser = await this.requireBudgetUser(household.householdId, currentUserId, budgetUserId)

      if (subscription.userId !== budgetUser.userId) {
        throw new NotFoundException('Subscription not found')
      }
    }

    const occurrenceDate = getSubscriptionTransactionOccurrenceDate(input)

    if (occurrenceDate < budget.startDate || occurrenceDate > budget.endDate) {
      throw new BadRequestException('Subscription occurrence date must be inside the selected budget period')
    }

    const expectedOccurrenceDate = getSubscriptionOccurrenceDate(subscription, budget.startDate, budget.endDate)

    if (expectedOccurrenceDate !== occurrenceDate) {
      throw new BadRequestException('Subscription occurrence date does not match this budget period')
    }

    const subscriptionTransaction = await this.subscriptionsRepository.createSubscriptionTransaction({
      amount: subscription.amount,
      date: occurrenceDate,
      subscriptionId: subscription.id,
      userId: currentUserId
    })

    return {
      subscription_transactions: [toSubscriptionTransaction(subscriptionTransaction)]
    }
  }

  async deleteSubscriptionTransactionForCurrentUser(
    currentUserId: string,
    budgetUserId: string,
    budgetId: string,
    transactionId: string
  ) {
    const household = await this.usersRepository.findHouseholdByUserId(currentUserId)

    if (!household) {
      throw new NotFoundException('Household not found')
    }

    const budget = await this.requireBudgetForHousehold(budgetId, household.householdId)
    const transactionUserId = await this.getBudgetTransactionUserId(household.householdId, currentUserId, budgetUserId)
    const subscriptionTransaction = await this.subscriptionsRepository.findSubscriptionTransactionByIdAndDateRange(
      transactionId,
      household.householdId,
      budget.startDate,
      budget.endDate,
      transactionUserId
    )

    if (!subscriptionTransaction) {
      throw new NotFoundException('Subscription transaction not found')
    }

    await this.subscriptionsRepository.deleteSubscriptionTransaction(subscriptionTransaction.id)

    return {
      deleted: true
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
    const result = await this.budgetCategoriesRepository.updateName(householdId, categoryId, name)

    if (result === 'not-found') {
      throw new NotFoundException('Budget category not found')
    }

    if (result === 'protected') {
      throw new BadRequestException('Default budget categories cannot be updated')
    }

    return {
      category: toBudgetCategory(result)
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
    const result = await this.budgetCategoriesRepository.delete(householdId, categoryId)

    if (result === 'not-found') {
      throw new NotFoundException('Budget category not found')
    }

    if (result === 'protected') {
      throw new BadRequestException('Default budget categories cannot be deleted')
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
      amount: getSubscriptionAmount(input),
      autopay: getSubscriptionAutopay(input)
    })

    const savedSubscription = await this.subscriptionsRepository.findByIdAndHouseholdId(subscription.id, householdId)

    return {
      subscription: toSubscription(savedSubscription || subscription)
    }
  }

  async updateSubscription(householdId: string, userId: string, subscriptionId: string, input: SaveSubscriptionDto) {
    await this.requireHouseholdUser(householdId, userId)
    const subscriptionUserId = await this.getSubscriptionUserId(householdId, input)
    const currentSubscription = await this.subscriptionsRepository.findByIdAndHouseholdId(subscriptionId, householdId)

    if (!currentSubscription) {
      throw new NotFoundException('Subscription not found')
    }

    const saveInput = {
      name: getSubscriptionName(input),
      userId: subscriptionUserId,
      type: getSubscriptionType(input),
      startDate: getSubscriptionStartDate(input),
      endDate: getSubscriptionEndDate(input),
      amount: getSubscriptionAmount(input),
      autopay: getSubscriptionAutopay(input)
    }
    const hasTransactions = await this.subscriptionsRepository.hasTransactions(currentSubscription.id)

    if (hasTransactions && shouldCreateSubscriptionReplacement(currentSubscription, saveInput)) {
      const today = getCurrentDateKey()
      const replacementStartDate = getNextSubscriptionChargeDate(saveInput.type, saveInput.startDate, today)

      if (saveInput.endDate && saveInput.endDate < replacementStartDate) {
        throw new BadRequestException('Subscription end date must be on or after the next charge date')
      }

      const replacementSubscription = await this.subscriptionsRepository.endAndCreateReplacement(
        householdId,
        currentSubscription.id,
        today,
        {
          householdId,
          ...saveInput,
          startDate: replacementStartDate
        }
      )

      if (!replacementSubscription) {
        throw new NotFoundException('Subscription not found')
      }

      return {
        subscription: toSubscription(replacementSubscription)
      }
    }

    const subscription = await this.subscriptionsRepository.update(householdId, subscriptionId, saveInput)

    if (!subscription) {
      throw new NotFoundException('Subscription not found')
    }

    if (saveInput.endDate) {
      await this.subscriptionsRepository.deleteTransactionsAfterDate(subscription.id, saveInput.endDate)
    }

    return {
      subscription: toSubscription(subscription)
    }
  }

  async deleteSubscription(householdId: string, userId: string, subscriptionId: string) {
    await this.requireHouseholdUser(householdId, userId)
    const subscription = await this.subscriptionsRepository.findByIdAndHouseholdId(subscriptionId, householdId)

    if (!subscription) {
      throw new NotFoundException('Subscription not found')
    }

    if (await this.subscriptionsRepository.hasTransactions(subscription.id)) {
      throw new BadRequestException('Subscriptions with transactions cannot be deleted')
    }

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

  private async getBudgetTransactionUserId(householdId: string, currentUserId: string, budgetUserId: string) {
    if (budgetUserId === householdBudgetUserId) {
      await this.requireHouseholdUser(householdId, currentUserId)

      return undefined
    }

    const budgetUser = await this.requireBudgetUser(householdId, currentUserId, budgetUserId)

    return budgetUser.userId
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
    type: category.type,
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

function getSubscriptionAutopay(input: SaveSubscriptionDto) {
  return input?.autopay === true
}

function shouldCreateSubscriptionReplacement(
  currentSubscription: SubscriptionEntity,
  input: Pick<SubscriptionEntity, 'amount' | 'startDate'>
) {
  return Number(currentSubscription.amount).toFixed(2) !== Number(input.amount).toFixed(2)
    || currentSubscription.startDate !== input.startDate
}

function getNextSubscriptionChargeDate(type: SubscriptionType, startDate: string, today: string) {
  const startDateParts = parseDateParts(startDate)
  const todayParts = parseDateParts(today)

  if (type === SubscriptionType.Yearly) {
    for (let yearOffset = 0; yearOffset <= 100; yearOffset += 1) {
      const candidate = getValidUtcDate(todayParts.year + yearOffset, startDateParts.month, startDateParts.day)
      const candidateDate = candidate ? formatUtcDate(candidate) : null

      if (candidateDate && candidateDate > today) {
        return candidateDate
      }
    }
  } else {
    for (let monthOffset = 0; monthOffset <= 240; monthOffset += 1) {
      const monthStart = new Date(Date.UTC(todayParts.year, todayParts.month - 1 + monthOffset, 1))
      const candidate = getValidUtcDate(
        monthStart.getUTCFullYear(),
        monthStart.getUTCMonth() + 1,
        startDateParts.day
      )
      const candidateDate = candidate ? formatUtcDate(candidate) : null

      if (candidateDate && candidateDate > today) {
        return candidateDate
      }
    }
  }

  throw new BadRequestException('Could not calculate next subscription charge date')
}

function getValidUtcDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day))

  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }

  return date
}

function getCurrentDateKey() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: process.env.SCHEDULING_TIMEZONE || 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())

  const year = parts.find(part => part.type === 'year')?.value
  const month = parts.find(part => part.type === 'month')?.value
  const day = parts.find(part => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Could not determine current subscription date')
  }

  return `${year}-${month}-${day}`
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
    autopay: subscription.autopay,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt
  }
}

function toBudgetSubscriptions(subscription: SubscriptionEntity, budgetStartDate: string, budgetEndDate: string) {
  return getSubscriptionOccurrenceDates(subscription, budgetStartDate, budgetEndDate).map(occurrenceDate => ({
    id: subscription.id,
    name: subscription.name,
    amount: subscription.amount,
    userId: subscription.userId,
    occurrenceDate
  }))
}

function sortBudgetSubscriptions(first: ReturnType<typeof toBudgetSubscriptions>[number], second: ReturnType<typeof toBudgetSubscriptions>[number]) {
  return first.occurrenceDate.localeCompare(second.occurrenceDate)
    || first.name.localeCompare(second.name)
    || first.id.localeCompare(second.id)
}

function getSubscriptionOccurrenceDate(subscription: SubscriptionEntity, budgetStartDate: string, budgetEndDate: string) {
  return getSubscriptionOccurrenceDates(subscription, budgetStartDate, budgetEndDate)[0] || null
}

function getSubscriptionOccurrenceDates(subscription: SubscriptionEntity, budgetStartDate: string, budgetEndDate: string) {
  const occurrenceDates: string[] = []

  for (const date of listDateRange(budgetStartDate, budgetEndDate)) {
    if (date < subscription.startDate) {
      continue
    }

    if (subscription.endDate && date > subscription.endDate) {
      continue
    }

    if (isSubscriptionOccurrenceDate(subscription, date)) {
      occurrenceDates.push(date)
    }
  }

  return occurrenceDates
}

function isSubscriptionOccurrenceDate(subscription: SubscriptionEntity, date: string) {
  const startDateParts = parseDateParts(subscription.startDate)
  const dateParts = parseDateParts(date)

  if (subscription.type === SubscriptionType.Monthly) {
    return dateParts.day === startDateParts.day
  }

  return dateParts.month === startDateParts.month && dateParts.day === startDateParts.day
}

function listDateRange(startDate: string, endDate: string) {
  const dates: string[] = []
  const current = parseUtcDate(startDate)
  const end = parseUtcDate(endDate)

  while (current <= end) {
    dates.push(formatUtcDate(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return dates
}

function parseDateParts(date: string) {
  const [year, month, day] = date.split('-').map(Number)

  return {
    year,
    month,
    day
  }
}

function parseUtcDate(date: string) {
  const parts = parseDateParts(date)

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getSubscriptionTransactionSubscriptionId(input: CreateSubscriptionTransactionDto) {
  const subscriptionId = typeof input?.subscriptionId === 'string' ? input.subscriptionId.trim() : ''

  if (!subscriptionId) {
    throw new BadRequestException('Subscription id is required')
  }

  return subscriptionId
}

function getSubscriptionTransactionOccurrenceDate(input: CreateSubscriptionTransactionDto) {
  const occurrenceDate = typeof input?.occurrenceDate === 'string' ? input.occurrenceDate : ''

  if (!isDateString(occurrenceDate)) {
    throw new BadRequestException('Subscription occurrence date must be in YYYY-MM-DD format')
  }

  return occurrenceDate
}

function toSubscriptionTransaction(subscriptionTransaction: { id: string, amount: number, date: string, subscriptionId: string, userId: string }) {
  return {
    id: subscriptionTransaction.id,
    subscriptionId: subscriptionTransaction.subscriptionId,
    userId: subscriptionTransaction.userId,
    amount: subscriptionTransaction.amount,
    date: subscriptionTransaction.date
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

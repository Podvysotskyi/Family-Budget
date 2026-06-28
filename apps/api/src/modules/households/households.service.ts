import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { BudgetCategoriesRepository } from '../budget-categories/budget-categories.repository'
import type { BudgetCategoryReorderDirection } from '../budget-categories/budget-categories.repository'
import type { SaveBudgetCategoryDto } from '../budget-categories/dto/save-budget-category.dto'
import type { BudgetCategoryEntity } from '../budget-categories/entities/budget-category.entity'
import { buildBudgetInputsForMonth } from '../budgets/budget-windows'
import { BudgetsRepository, sortBudgetPeriods, toBudgetPeriod } from '../budgets/budgets.repository'
import { BudgetType } from '../budgets/entities/budget-type'
import { CreditCardsRepository } from '../credit-cards/credit-cards.repository'
import type { CancelCreditCardDto } from '../credit-cards/dto/cancel-credit-card.dto'
import type { UpdateCreditCardBalanceDto } from '../credit-cards/dto/update-credit-card-balance.dto'
import type { SaveCreditCardDto } from '../credit-cards/dto/save-credit-card.dto'
import type { CreditCardEntity } from '../credit-cards/entities/credit-card.entity'
import type { SaveGoalDto } from '../goals/dto/save-goal.dto'
import type { GoalEntity } from '../goals/entities/goal.entity'
import { GoalTargetType } from '../goals/entities/goal-target-type'
import { GoalsRepository } from '../goals/goals.repository'
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
import type { HouseholdMember } from './interfaces/household-member.interface'

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
    @Inject(CreditCardsRepository) private readonly creditCardsRepository: CreditCardsRepository,
    @Inject(GoalsRepository) private readonly goalsRepository: GoalsRepository,
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
      amount: getSubscriptionAmountForDate(subscription, occurrenceDate),
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
    }, getCurrentMonthEndDate())

    if (!subscription) {
      throw new NotFoundException('Subscription not found')
    }

    return {
      subscription: toSubscription(subscription)
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
    const nextChargeDate = getSubscriptionNextChargeDate(input)

    if (nextChargeDate) {
      validateSubscriptionNextChargeDate(nextChargeDate, saveInput.startDate, saveInput.endDate)
    }

    const existingNextChargeDate = nextChargeDate
      ? getSubscriptionOccurrenceDate(
          currentSubscription,
          getMonthStartDate(nextChargeDate),
          getMonthEndDate(nextChargeDate)
        )
      : null
    const subscription = await this.subscriptionsRepository.update(householdId, subscriptionId, {
      ...saveInput,
      amountEffectiveDate: getCurrentDateKey(),
      ensureDatesThroughDate: getCurrentMonthEndDate(),
      nextChargeDate: nextChargeDate && nextChargeDate !== existingNextChargeDate ? nextChargeDate : null
    })

    if (!subscription) {
      throw new NotFoundException('Subscription not found')
    }

    if (saveInput.endDate) {
      await this.subscriptionsRepository.deleteTransactionsAfterDate(subscription.id, saveInput.endDate)
      await this.subscriptionsRepository.deleteSubscriptionDatesAfterDate(subscription.id, saveInput.endDate)
    }

    return {
      subscription: toSubscription(subscription)
    }
  }

  async listCreditCards(householdId: string, userId: string) {
    await this.requireHouseholdUser(householdId, userId)
    const creditCards = await this.creditCardsRepository.listByHouseholdId(householdId)
    const members = await this.usersRepository.listByHouseholdId(householdId)
    const onlyMember = members.length === 1 ? members[0]! : null

    return {
      creditCards: creditCards
        .filter(creditCard => !creditCard.userId || creditCard.userId === userId)
        .map(creditCard => toCreditCard(creditCard, onlyMember))
    }
  }

  async createHouseholdCreditCard(householdId: string, userId: string, input: SaveCreditCardDto) {
    await this.requireHouseholdUser(householdId, userId)

    return this.createCreditCard(householdId, null, input)
  }

  async createUserCreditCard(currentUserId: string, creditCardUserId: string, input: SaveCreditCardDto) {
    const household = await this.usersRepository.findHouseholdByUserId(creditCardUserId)

    if (!household) {
      throw new NotFoundException('Credit card user not found')
    }

    await this.requireHouseholdUser(household.householdId, currentUserId)

    if (creditCardUserId !== currentUserId) {
      throw new ForbiddenException('Credit cards can only be created for current user or household')
    }

    return this.createCreditCard(household.householdId, creditCardUserId, input)
  }

  private async createCreditCard(householdId: string, creditCardUserId: string | null, input: SaveCreditCardDto) {
    const dueDate = getCreditCardDueDate(input)
    const startDate = getCreditCardStartDate(input)
    const creditCard = await this.creditCardsRepository.create(
      {
        householdId,
        name: getCreditCardName(input),
        userId: creditCardUserId,
        startDate,
        endDate: null,
        dueDate
      },
      {
        date: startDate,
        limit: getCreditCardLimit(input)
      }
    )

    if (!creditCard) {
      throw new NotFoundException('Credit card not found')
    }

    return {
      creditCard: toCreditCard(creditCard)
    }
  }

  async updateCreditCard(householdId: string, userId: string, creditCardId: string, input: SaveCreditCardDto) {
    await this.requireHouseholdUser(householdId, userId)
    const currentCreditCard = await this.creditCardsRepository.findByIdAndHouseholdId(creditCardId, householdId)

    if (!currentCreditCard || (currentCreditCard.userId && currentCreditCard.userId !== userId)) {
      throw new NotFoundException('Credit card not found')
    }

    if (currentCreditCard.endDate) {
      throw new BadRequestException('Canceled credit cards cannot be edited')
    }

    const creditCardUserId = await this.getCreditCardUserId(householdId, input)

    if (creditCardUserId && creditCardUserId !== userId) {
      throw new ForbiddenException('Credit cards can only be assigned to current user or household')
    }

    const startDate = getCreditCardStartDate(input)

    const creditCard = await this.creditCardsRepository.update(
      householdId,
      creditCardId,
      {
        name: getCreditCardName(input),
        userId: creditCardUserId,
        startDate,
        endDate: null,
        dueDate: getCreditCardDueDate(input)
      },
      {
        date: startDate,
        limit: getCreditCardLimit(input)
      }
    )

    if (!creditCard) {
      throw new NotFoundException('Credit card not found')
    }

    return {
      creditCard: toCreditCard(creditCard)
    }
  }

  async cancelCreditCard(householdId: string, userId: string, creditCardId: string, input: CancelCreditCardDto) {
    await this.requireHouseholdUser(householdId, userId)
    const creditCard = await this.creditCardsRepository.findByIdAndHouseholdId(creditCardId, householdId)

    if (!creditCard || (creditCard.userId && creditCard.userId !== userId)) {
      throw new NotFoundException('Credit card not found')
    }

    if (creditCard.endDate) {
      throw new BadRequestException('Credit card is already canceled')
    }

    await this.creditCardsRepository.cancel(
      householdId,
      creditCardId,
      getCreditCardCancellationDate(input, creditCard.startDate)
    )

    return {
      canceled: true
    }
  }

  async updateCreditCardBalance(householdId: string, userId: string, creditCardId: string, input: UpdateCreditCardBalanceDto) {
    await this.requireHouseholdUser(householdId, userId)
    const creditCard = await this.creditCardsRepository.findByIdAndHouseholdId(creditCardId, householdId)

    if (!creditCard || (creditCard.userId && creditCard.userId !== userId)) {
      throw new NotFoundException('Credit card not found')
    }

    if (creditCard.endDate) {
      throw new BadRequestException('Canceled credit cards cannot be edited')
    }

    const balanceDate = getCreditCardBalanceDate(input, creditCard.startDate)
    const balance = await this.creditCardsRepository.updateBalance({
      creditCardId,
      date: balanceDate,
      balance: getCreditCardBalance(input)
    })

    return {
      balance
    }
  }

  async listGoals(householdId: string, userId: string) {
    await this.requireHouseholdUser(householdId, userId)
    const goals = await this.goalsRepository.listByHouseholdId(householdId)

    return {
      goals: await Promise.all(goals
        .filter(goal => !goal.userId || goal.userId === userId)
        .map(goal => this.toGoal(goal)))
    }
  }

  async createGoal(householdId: string, userId: string, input: SaveGoalDto) {
    await this.requireHouseholdUser(householdId, userId)
    const goalUserId = await this.getGoalUserId(householdId, input)

    if (goalUserId && goalUserId !== userId) {
      throw new ForbiddenException('Goals can only be created for current user or household')
    }

    const startDate = getGoalStartDate(input)
    const endDate = getGoalEndDate(input, startDate)
    const goal = await this.goalsRepository.create(
      {
        householdId,
        name: getGoalName(input),
        userId: goalUserId,
        startDate,
        endDate,
        includeInBudget: getGoalIncludeInBudget(input)
      },
      {
        amount: getGoalTargetAmount(input),
        date: getCurrentDateKey(),
        type: getGoalTargetType(input)
      }
    )

    if (!goal) {
      throw new NotFoundException('Goal not found')
    }

    return {
      goal: await this.toGoal(goal)
    }
  }

  async updateGoal(householdId: string, userId: string, goalId: string, input: SaveGoalDto) {
    await this.requireHouseholdUser(householdId, userId)
    const currentGoal = await this.goalsRepository.findByIdAndHouseholdId(goalId, householdId)

    if (!currentGoal || (currentGoal.userId && currentGoal.userId !== userId)) {
      throw new NotFoundException('Goal not found')
    }

    const goalUserId = await this.getGoalUserId(householdId, input)

    if (goalUserId && goalUserId !== userId) {
      throw new ForbiddenException('Goals can only be assigned to current user or household')
    }

    const startDate = getGoalStartDate(input)
    const endDate = getGoalEndDate(input, startDate)
    const goal = await this.goalsRepository.update(
      householdId,
      goalId,
      {
        name: getGoalName(input),
        userId: goalUserId,
        startDate,
        endDate,
        includeInBudget: getGoalIncludeInBudget(input)
      },
      {
        amount: getGoalTargetAmount(input),
        date: getCurrentDateKey(),
        type: getGoalTargetType(input)
      }
    )

    if (!goal) {
      throw new NotFoundException('Goal not found')
    }

    return {
      goal: await this.toGoal(goal)
    }
  }

  async deleteGoal(householdId: string, userId: string, goalId: string) {
    await this.requireHouseholdUser(householdId, userId)
    const goal = await this.goalsRepository.findByIdAndHouseholdId(goalId, householdId)

    if (!goal || (goal.userId && goal.userId !== userId)) {
      throw new NotFoundException('Goal not found')
    }

    await this.goalsRepository.end(householdId, goalId, getCurrentDateKey())

    return {
      deleted: true
    }
  }

  async permanentlyDeleteGoal(householdId: string, userId: string, goalId: string) {
    await this.requireHouseholdUser(householdId, userId)
    const goal = await this.goalsRepository.findByIdAndHouseholdId(goalId, householdId)

    if (!goal || (goal.userId && goal.userId !== userId)) {
      throw new NotFoundException('Goal not found')
    }

    if (await this.goalsRepository.hasTransactions(goal.id)) {
      throw new BadRequestException('Goals with transactions cannot be permanently deleted')
    }

    const deleted = await this.goalsRepository.delete(householdId, goalId)

    if (!deleted) {
      throw new NotFoundException('Goal not found')
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

  private async getCreditCardUserId(householdId: string, input: SaveCreditCardDto) {
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
      throw new NotFoundException('Credit card user not found')
    }

    return user.id
  }

  private async getGoalUserId(householdId: string, input: SaveGoalDto) {
    const userId = typeof input?.userId === 'string' && input.userId.trim() ? input.userId.trim() : null

    if (!userId) {
      return null
    }

    const user = await this.usersRepository.findByHouseholdIdAndUserId(householdId, userId)

    if (!user) {
      throw new NotFoundException('Goal user not found')
    }

    return user.id
  }

  private async toGoal(goal: GoalEntity) {
    const sortedTargets = [...(goal.targets || [])]
      .sort((first, second) => second.date.localeCompare(first.date) || second.id.localeCompare(first.id))
    const transactionCount = await this.goalsRepository.countTransactions(goal.id)

    return {
      id: goal.id,
      householdId: goal.householdId,
      name: goal.name,
      userId: goal.userId,
      user: goal.user
        ? {
            userId: goal.user.id,
            name: goal.user.name,
            email: goal.user.email,
            avatarUrl: goal.user.avatarUrl
          }
        : null,
      startDate: goal.startDate,
      endDate: goal.endDate,
      includeInBudget: goal.includeInBudget,
      currentTarget: sortedTargets[0]
        ? {
            id: sortedTargets[0].id,
            date: sortedTargets[0].date,
            type: sortedTargets[0].type,
            amount: sortedTargets[0].amount
          }
        : null,
      targets: sortedTargets.map(target => ({
        id: target.id,
        date: target.date,
        type: target.type,
        amount: target.amount
      })),
      transactionCount,
      canDeletePermanently: transactionCount === 0,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt
    }
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

function getSubscriptionNextChargeDate(input: SaveSubscriptionDto) {
  const nextChargeDate = typeof input?.nextChargeDate === 'string' && input.nextChargeDate ? input.nextChargeDate : null

  if (!nextChargeDate) {
    return null
  }

  if (!isDateString(nextChargeDate)) {
    throw new BadRequestException('Next charge date must be in YYYY-MM-DD format')
  }

  return nextChargeDate
}

function validateSubscriptionNextChargeDate(nextChargeDate: string, startDate: string, endDate: string | null) {
  if (nextChargeDate < startDate) {
    throw new BadRequestException('Next charge date must be on or after the start date')
  }

  if (endDate && nextChargeDate > endDate) {
    throw new BadRequestException('Next charge date must be on or before the end date')
  }
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

function getCreditCardName(input: SaveCreditCardDto) {
  const name = typeof input?.name === 'string' ? input.name.trim() : ''

  if (!name) {
    throw new BadRequestException('Credit card name is required')
  }

  return name
}

function getCreditCardStartDate(input: SaveCreditCardDto) {
  const startDate = typeof input?.startDate === 'string' ? input.startDate : ''

  if (!isDateString(startDate)) {
    throw new BadRequestException('Credit card start date must be in YYYY-MM-DD format')
  }

  return startDate
}

function getCreditCardDueDate(input: SaveCreditCardDto) {
  const dueDate = typeof input?.dueDate === 'string' ? input.dueDate : ''

  if (!isDateString(dueDate)) {
    throw new BadRequestException('Credit card due date must be in YYYY-MM-DD format')
  }

  return dueDate
}

function getCreditCardCancellationDate(input: CancelCreditCardDto, startDate: string) {
  const effectiveDate = typeof input?.effectiveDate === 'string' ? input.effectiveDate : ''

  if (!isDateString(effectiveDate)) {
    throw new BadRequestException('Credit card cancellation effective date must be in YYYY-MM-DD format')
  }

  if (effectiveDate < startDate) {
    throw new BadRequestException('Credit card cancellation effective date must be on or after the start date')
  }

  return effectiveDate
}

function getCreditCardLimit(input: SaveCreditCardDto) {
  const limit = Number(input?.limit)

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new BadRequestException('Credit card limit must be greater than zero')
  }

  return limit
}

function getCreditCardBalanceDate(input: UpdateCreditCardBalanceDto, startDate: string) {
  const balanceDate = typeof input?.date === 'string' ? input.date : ''

  if (!isDateString(balanceDate)) {
    throw new BadRequestException('Credit card balance date must be in YYYY-MM-DD format')
  }

  if (balanceDate < startDate) {
    throw new BadRequestException('Credit card balance date must be on or after the start date')
  }

  if (balanceDate > getCurrentDateKey()) {
    throw new BadRequestException('Credit card balance date cannot be in the future')
  }

  return balanceDate
}

function getCreditCardBalance(input: UpdateCreditCardBalanceDto) {
  const balance = Number(input?.balance)

  if (!Number.isFinite(balance) || balance < 0) {
    throw new BadRequestException('Credit card balance must be zero or greater')
  }

  return balance
}

function getGoalName(input: SaveGoalDto) {
  const name = typeof input?.name === 'string' ? input.name.trim() : ''

  if (!name) {
    throw new BadRequestException('Goal name is required')
  }

  return name
}

function getGoalStartDate(input: SaveGoalDto) {
  const startDate = typeof input?.startDate === 'string' ? input.startDate : ''

  if (!isDateString(startDate)) {
    throw new BadRequestException('Goal start date must be in YYYY-MM-DD format')
  }

  return startDate
}

function getGoalEndDate(input: SaveGoalDto, startDate: string) {
  const endDate = typeof input?.endDate === 'string' && input.endDate ? input.endDate : null

  if (!endDate) {
    return null
  }

  if (!isDateString(endDate)) {
    throw new BadRequestException('Goal end date must be in YYYY-MM-DD format')
  }

  if (endDate < startDate) {
    throw new BadRequestException('Goal end date must be on or after the start date')
  }

  return endDate
}

function getGoalIncludeInBudget(input: SaveGoalDto) {
  return input?.includeInBudget !== false
}

function getGoalTargetType(input: SaveGoalDto) {
  if (
    input?.targetType === GoalTargetType.Monthly
    || input?.targetType === GoalTargetType.Weekly
    || input?.targetType === GoalTargetType.Total
  ) {
    return input.targetType
  }

  throw new BadRequestException('Goal target type must be monthly, weekly, or total')
}

function getGoalTargetAmount(input: SaveGoalDto) {
  const amount = Number(input?.targetAmount)

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestException('Goal target amount must be greater than zero')
  }

  return amount
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
    throw new Error('Could not determine current date')
  }

  return `${year}-${month}-${day}`
}

function getCurrentMonthEndDate() {
  const parts = parseDateParts(getCurrentDateKey())

  return formatUtcDate(new Date(Date.UTC(parts.year, parts.month, 0)))
}

function getMonthStartDate(date: string) {
  const parts = parseDateParts(date)

  return `${parts.year}-${String(parts.month).padStart(2, '0')}-01`
}

function getMonthEndDate(date: string) {
  const parts = parseDateParts(date)

  return formatUtcDate(new Date(Date.UTC(parts.year, parts.month, 0)))
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
    nextChargeDate: getNextSubscriptionChargeDate(subscription, getCurrentDateKey()),
    amount: getSubscriptionAmountForDate(subscription, getCurrentDateKey()),
    autopay: subscription.autopay,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt
  }
}

function toCreditCard(creditCard: CreditCardEntity, assignedUser: HouseholdMember | null = null) {
  const sortedLimits = [...(creditCard.limits || [])]
    .sort((first, second) => second.date.localeCompare(first.date) || second.id.localeCompare(first.id))
  const user = creditCard.user
    ? {
        userId: creditCard.user.id,
        name: creditCard.user.name,
        email: creditCard.user.email,
        avatarUrl: creditCard.user.avatarUrl
      }
    : assignedUser
      ? {
          userId: assignedUser.userId,
          name: assignedUser.name,
          email: assignedUser.email,
          avatarUrl: assignedUser.avatarUrl
        }
      : null

  return {
    id: creditCard.id,
    householdId: creditCard.householdId,
    name: creditCard.name,
    userId: creditCard.userId || assignedUser?.userId || null,
    user,
    startDate: creditCard.startDate,
    endDate: creditCard.endDate,
    dueDate: creditCard.dueDate,
    currentBalance: getCreditCardBalanceForDate(creditCard, getCurrentDateKey()),
    currentLimit: getCreditCardLimitForDate(creditCard, getCurrentDateKey()),
    balances: [...(creditCard.balances || [])]
      .sort((first, second) => second.date.localeCompare(first.date))
      .map(balance => ({
        id: balance.id,
        date: balance.date,
        balance: balance.balance
      })),
    limits: sortedLimits.map(limit => ({
      id: limit.id,
      date: limit.date,
      limit: limit.limit
    })),
    createdAt: creditCard.createdAt,
    updatedAt: creditCard.updatedAt
  }
}

function getCreditCardLimitForDate(creditCard: CreditCardEntity, date: string) {
  const sortedLimits = [...(creditCard.limits || [])].sort((first, second) => first.date.localeCompare(second.date))
  let effectiveLimit: number | null = null

  for (const limit of sortedLimits) {
    if (limit.date > date) {
      break
    }

    effectiveLimit = limit.limit
  }

  return effectiveLimit ?? sortedLimits[0]?.limit ?? null
}

function getCreditCardBalanceForDate(creditCard: CreditCardEntity, date: string) {
  const sortedBalances = [...(creditCard.balances || [])].sort((first, second) => first.date.localeCompare(second.date))
  let effectiveBalance: number | null = null

  for (const balance of sortedBalances) {
    if (balance.date > date) {
      break
    }

    effectiveBalance = balance.balance
  }

  return effectiveBalance ?? sortedBalances[0]?.balance ?? null
}

function toBudgetSubscriptions(subscription: SubscriptionEntity, budgetStartDate: string, budgetEndDate: string) {
  return getSubscriptionOccurrenceDates(subscription, budgetStartDate, budgetEndDate).map(occurrenceDate => ({
    id: subscription.id,
    name: subscription.name,
    amount: getSubscriptionAmountForDate(subscription, occurrenceDate),
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
  const occurrenceStartDate = subscription.startDate > budgetStartDate ? subscription.startDate : budgetStartDate
  const occurrenceEndDate = subscription.endDate && subscription.endDate < budgetEndDate ? subscription.endDate : budgetEndDate

  if (occurrenceStartDate > occurrenceEndDate) {
    return []
  }

  return getSubscriptionOccurrenceDatesFromSchedule(subscription, occurrenceStartDate, occurrenceEndDate)
}

function parseDateParts(date: string) {
  const [year, month, day] = date.split('-').map(Number)

  return {
    year,
    month,
    day
  }
}

function formatUtcDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getNextSubscriptionChargeDate(subscription: SubscriptionEntity, referenceDate: string) {
  const searchEndDate = subscription.type === SubscriptionType.Yearly
    ? addYearsToDateKey(referenceDate, 2)
    : addMonthsToDateKey(referenceDate, 24)

  return getSubscriptionOccurrenceDates(subscription, referenceDate, searchEndDate)[0] || null
}

function getSubscriptionOccurrenceDatesFromSchedule(subscription: SubscriptionEntity, rangeStartDate: string, rangeEndDate: string) {
  const dates: string[] = []
  const existingDatesByPeriod = getExistingSubscriptionDatesByPeriod(subscription)
  let candidateDate = subscription.startDate

  while (candidateDate <= rangeEndDate) {
    const periodKey = getSubscriptionDatePeriodKey(subscription.type, candidateDate)
    const existingDate = existingDatesByPeriod.get(periodKey)
    const occurrenceDate = existingDate || candidateDate

    if (occurrenceDate >= rangeStartDate && occurrenceDate <= rangeEndDate) {
      dates.push(occurrenceDate)
    }

    candidateDate = getNextSubscriptionOccurrenceDate(subscription.type, occurrenceDate)
  }

  return dates
}

function getExistingSubscriptionDatesByPeriod(subscription: SubscriptionEntity) {
  const datesByPeriod = new Map<string, string>()

  for (const date of (subscription.dates || []).map(subscriptionDate => subscriptionDate.date).sort()) {
    datesByPeriod.set(getSubscriptionDatePeriodKey(subscription.type, date), date)
  }

  return datesByPeriod
}

function getSubscriptionDatePeriodKey(type: SubscriptionType, date: string) {
  const parts = parseDateParts(date)

  if (type === SubscriptionType.Yearly) {
    return String(parts.year)
  }

  return `${parts.year}-${String(parts.month).padStart(2, '0')}`
}

function getNextSubscriptionOccurrenceDate(type: SubscriptionType, date: string) {
  const parts = parseDateParts(date)

  if (type === SubscriptionType.Yearly) {
    return formatUtcDate(getClampedUtcDate(parts.year + 1, parts.month, parts.day))
  }

  const nextMonth = getNextMonth(parts.year, parts.month)

  return formatUtcDate(getClampedUtcDate(nextMonth.year, nextMonth.month, parts.day))
}

function addMonthsToDateKey(date: string, monthCount: number) {
  const parts = parseDateParts(date)
  const nextDate = new Date(Date.UTC(parts.year, parts.month - 1 + monthCount, parts.day))

  return formatUtcDate(nextDate)
}

function addYearsToDateKey(date: string, yearCount: number) {
  const parts = parseDateParts(date)

  return formatUtcDate(getClampedUtcDate(parts.year + yearCount, parts.month, parts.day))
}

function getNextMonth(year: number, month: number) {
  if (month === 12) {
    return {
      year: year + 1,
      month: 1
    }
  }

  return {
    year,
    month: month + 1
  }
}

function getClampedUtcDate(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

  return new Date(Date.UTC(year, month - 1, Math.min(day, lastDay)))
}

function getSubscriptionAmountForDate(subscription: SubscriptionEntity, date: string) {
  const sortedAmounts = [...(subscription.amounts || [])].sort((first, second) => first.date.localeCompare(second.date))
  let effectiveAmount: number | null = null

  for (const amount of sortedAmounts) {
    if (amount.date > date) {
      break
    }

    effectiveAmount = amount.amount
  }

  const amount = effectiveAmount ?? sortedAmounts[0]?.amount

  if (amount === undefined) {
    throw new BadRequestException('Subscription amount is missing')
  }

  return amount
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

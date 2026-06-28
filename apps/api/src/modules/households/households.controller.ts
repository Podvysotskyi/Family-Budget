import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/request-user'
import { requireRequestUser } from '../auth/request-user'
import type { BudgetCategoryReorderDirection } from '../budget-categories/budget-categories.repository'
import type { SaveBudgetCategoryDto } from '../budget-categories/dto/save-budget-category.dto'
import type { CancelCreditCardDto } from '../credit-cards/dto/cancel-credit-card.dto'
import type { UpdateCreditCardBalanceDto } from '../credit-cards/dto/update-credit-card-balance.dto'
import type { SaveCreditCardDto } from '../credit-cards/dto/save-credit-card.dto'
import type { SaveGoalDto } from '../goals/dto/save-goal.dto'
import type { SaveIncomeTypeDto } from '../income-types/dto/save-income-type.dto'
import type { SaveSubscriptionDto } from '../subscriptions/dto/save-subscription.dto'
import type { UpdateHouseholdDto } from './dto/update-household.dto'
import { HouseholdService } from './households.service'

@Controller('households')
export class HouseholdsController {
  constructor(@Inject(HouseholdService) private readonly householdService: HouseholdService) {}

  @Get(':id/dashboard')
  dashboard(@Param('id') householdId: string, @Req() request: AuthenticatedRequest) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    return this.householdService.getDashboard(householdId, user.id)
  }

  @Patch(':id')
  update(
    @Param('id') householdId: string,
    @Body() input: UpdateHouseholdDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    return this.householdService.update(householdId, user.id, input)
  }

  @Get(':id/budget-categories')
  budgetCategories(@Param('id') householdId: string, @Req() request: AuthenticatedRequest) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    return this.householdService.listBudgetCategories(householdId, user.id)
  }

  @Post(':id/budget-categories')
  createBudgetCategory(
    @Param('id') householdId: string,
    @Body() input: SaveBudgetCategoryDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    return this.householdService.createBudgetCategory(householdId, user.id, input)
  }

  @Patch(':id/budget-categories/:categoryId')
  updateBudgetCategory(
    @Param('id') householdId: string,
    @Param('categoryId') categoryId: string,
    @Body() input: SaveBudgetCategoryDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    if (!categoryId) {
      throw new BadRequestException('Budget category id is required')
    }

    return this.householdService.updateBudgetCategory(householdId, user.id, categoryId, input)
  }

  @Patch(':id/budget-categories/:categoryId/order/:direction')
  reorderBudgetCategory(
    @Param('id') householdId: string,
    @Param('categoryId') categoryId: string,
    @Param('direction') direction: string,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    if (!categoryId) {
      throw new BadRequestException('Budget category id is required')
    }

    return this.householdService.reorderBudgetCategory(householdId, user.id, categoryId, parseBudgetCategoryDirection(direction))
  }

  @Delete(':id/budget-categories/:categoryId')
  deleteBudgetCategory(
    @Param('id') householdId: string,
    @Param('categoryId') categoryId: string,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    if (!categoryId) {
      throw new BadRequestException('Budget category id is required')
    }

    return this.householdService.deleteBudgetCategory(householdId, user.id, categoryId)
  }

  @Get(':id/income-types')
  incomeTypes(@Param('id') householdId: string, @Req() request: AuthenticatedRequest) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    return this.householdService.listIncomeTypes(householdId, user.id)
  }

  @Post(':id/income-types')
  createIncomeType(
    @Param('id') householdId: string,
    @Body() input: SaveIncomeTypeDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    return this.householdService.createIncomeType(householdId, user.id, input)
  }

  @Patch(':id/income-types/:incomeTypeId')
  updateIncomeType(
    @Param('id') householdId: string,
    @Param('incomeTypeId') incomeTypeId: string,
    @Body() input: SaveIncomeTypeDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    if (!incomeTypeId) {
      throw new BadRequestException('Income type id is required')
    }

    return this.householdService.updateIncomeType(householdId, user.id, incomeTypeId, input)
  }

  @Delete(':id/income-types/:incomeTypeId')
  deleteIncomeType(
    @Param('id') householdId: string,
    @Param('incomeTypeId') incomeTypeId: string,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    if (!incomeTypeId) {
      throw new BadRequestException('Income type id is required')
    }

    return this.householdService.deleteIncomeType(householdId, user.id, incomeTypeId)
  }

  @Get(':id/subscriptions')
  subscriptions(@Param('id') householdId: string, @Req() request: AuthenticatedRequest) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    return this.householdService.listSubscriptions(householdId, user.id)
  }

  @Post(':id/subscriptions')
  createSubscription(
    @Param('id') householdId: string,
    @Body() input: SaveSubscriptionDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    return this.householdService.createSubscription(householdId, user.id, input)
  }

  @Patch(':id/subscriptions/:subscriptionId')
  updateSubscription(
    @Param('id') householdId: string,
    @Param('subscriptionId') subscriptionId: string,
    @Body() input: SaveSubscriptionDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    if (!subscriptionId) {
      throw new BadRequestException('Subscription id is required')
    }

    return this.householdService.updateSubscription(householdId, user.id, subscriptionId, input)
  }

  @Get(':id/credit-cards')
  creditCards(@Param('id') householdId: string, @Req() request: AuthenticatedRequest) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    return this.householdService.listCreditCards(householdId, user.id)
  }

  @Post(':id/credit-cards')
  createCreditCard(
    @Param('id') householdId: string,
    @Body() input: SaveCreditCardDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    return this.householdService.createHouseholdCreditCard(householdId, user.id, input)
  }

  @Patch(':id/credit-cards/:creditCardId')
  updateCreditCard(
    @Param('id') householdId: string,
    @Param('creditCardId') creditCardId: string,
    @Body() input: SaveCreditCardDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    if (!creditCardId) {
      throw new BadRequestException('Credit card id is required')
    }

    return this.householdService.updateCreditCard(householdId, user.id, creditCardId, input)
  }

  @Patch(':id/credit-cards/:creditCardId/cancel')
  cancelCreditCard(
    @Param('id') householdId: string,
    @Param('creditCardId') creditCardId: string,
    @Body() input: CancelCreditCardDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    if (!creditCardId) {
      throw new BadRequestException('Credit card id is required')
    }

    return this.householdService.cancelCreditCard(householdId, user.id, creditCardId, input)
  }

  @Patch(':id/credit-cards/:creditCardId/balance')
  updateCreditCardBalance(
    @Param('id') householdId: string,
    @Param('creditCardId') creditCardId: string,
    @Body() input: UpdateCreditCardBalanceDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    if (!creditCardId) {
      throw new BadRequestException('Credit card id is required')
    }

    return this.householdService.updateCreditCardBalance(householdId, user.id, creditCardId, input)
  }

  @Get(':id/goals')
  goals(@Param('id') householdId: string, @Req() request: AuthenticatedRequest) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    return this.householdService.listGoals(householdId, user.id)
  }

  @Post(':id/goals')
  createGoal(
    @Param('id') householdId: string,
    @Body() input: SaveGoalDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    return this.householdService.createGoal(householdId, user.id, input)
  }

  @Patch(':id/goals/:goalId')
  updateGoal(
    @Param('id') householdId: string,
    @Param('goalId') goalId: string,
    @Body() input: SaveGoalDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    if (!goalId) {
      throw new BadRequestException('Goal id is required')
    }

    return this.householdService.updateGoal(householdId, user.id, goalId, input)
  }

  @Delete(':id/goals/:goalId')
  deleteGoal(
    @Param('id') householdId: string,
    @Param('goalId') goalId: string,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    if (!goalId) {
      throw new BadRequestException('Goal id is required')
    }

    return this.householdService.deleteGoal(householdId, user.id, goalId)
  }

  @Delete(':id/goals/:goalId/permanent')
  permanentlyDeleteGoal(
    @Param('id') householdId: string,
    @Param('goalId') goalId: string,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!householdId) {
      throw new BadRequestException('Household id is required')
    }

    if (!goalId) {
      throw new BadRequestException('Goal id is required')
    }

    return this.householdService.permanentlyDeleteGoal(householdId, user.id, goalId)
  }
}

function parseBudgetCategoryDirection(direction: string): BudgetCategoryReorderDirection {
  if (direction === 'up' || direction === 'down') {
    return direction
  }

  throw new BadRequestException('Budget category direction must be up or down')
}

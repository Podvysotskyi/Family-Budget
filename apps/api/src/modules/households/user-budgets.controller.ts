import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/request-user'
import { requireRequestUser } from '../auth/request-user'
import type { CancelCreditCardDto } from '../credit-cards/dto/cancel-credit-card.dto'
import type { SaveCreditCardDto } from '../credit-cards/dto/save-credit-card.dto'
import type { UpdateCreditCardBalanceDto } from '../credit-cards/dto/update-credit-card-balance.dto'
import type { SaveIncomeDto } from '../income/dto/save-income.dto'
import type { CancelSubscriptionDto } from '../subscriptions/dto/cancel-subscription.dto'
import type { CreateSubscriptionTransactionDto } from '../subscriptions/dto/create-subscription-transaction.dto'
import type { SaveSubscriptionDto } from '../subscriptions/dto/save-subscription.dto'
import { HouseholdService } from './households.service'

@Controller()
export class UserBudgetsController {
  constructor(@Inject(HouseholdService) private readonly householdService: HouseholdService) {}

  @Get('household')
  household(@Req() request: AuthenticatedRequest) {
    const user = requireRequestUser(request)

    return this.householdService.getHouseholdForCurrentUser(user.id)
  }

  @Get('users/:id/budget-period/month')
  userBudgetMonthPeriod(
    @Param('id') budgetUserId: string,
    @Query('month') month: string | undefined,
    @Query('year') year: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!budgetUserId) {
      throw new BadRequestException('User id is required')
    }

    return this.householdService.getUserBudgetMonthPeriodForCurrentUser(
      user.id,
      budgetUserId,
      parseBudgetMonthQuery(month, year)
    )
  }

  @Get('user/:id/budget/:budgetId/income')
  userIncome(
    @Param('id') budgetUserId: string,
    @Param('budgetId') budgetId: string,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!budgetUserId) {
      throw new BadRequestException('User id is required')
    }

    if (!budgetId) {
      throw new BadRequestException('Budget id is required')
    }

    return this.householdService.listIncomeForCurrentUser(user.id, budgetUserId, budgetId)
  }

  @Get('user/:id/subscriptions')
  userSubscriptions(
    @Param('id') budgetUserId: string,
    @Query('from_date') fromDate: string | undefined,
    @Query('to_date') toDate: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!budgetUserId) {
      throw new BadRequestException('User id is required')
    }

    return this.householdService.listSubscriptionsForCurrentUser(user.id, budgetUserId, parseDateRangeQuery(fromDate, toDate))
  }

  @Get('user/:id/budget/:budgetId/transactions')
  userTransactions(
    @Param('id') budgetUserId: string,
    @Param('budgetId') budgetId: string,
    @Query('from_date') fromDate: string | undefined,
    @Query('to_date') toDate: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!budgetUserId) {
      throw new BadRequestException('User id is required')
    }

    if (!budgetId) {
      throw new BadRequestException('Budget id is required')
    }

    return this.householdService.listBudgetTransactionsForCurrentUser(
      user.id,
      budgetUserId,
      budgetId,
      parseDateRangeQuery(fromDate, toDate)
    )
  }

  @Post('user/:id/budget/:budgetId/transactions')
  createSubscriptionTransaction(
    @Param('id') budgetUserId: string,
    @Param('budgetId') budgetId: string,
    @Body() input: CreateSubscriptionTransactionDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!budgetUserId) {
      throw new BadRequestException('User id is required')
    }

    if (!budgetId) {
      throw new BadRequestException('Budget id is required')
    }

    return this.householdService.createSubscriptionTransactionForCurrentUser(user.id, budgetUserId, budgetId, input)
  }

  @Delete('user/:id/budget/:budgetId/transactions/:transactionId')
  deleteSubscriptionTransaction(
    @Param('id') budgetUserId: string,
    @Param('budgetId') budgetId: string,
    @Param('transactionId') transactionId: string,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!budgetUserId) {
      throw new BadRequestException('User id is required')
    }

    if (!budgetId) {
      throw new BadRequestException('Budget id is required')
    }

    if (!transactionId) {
      throw new BadRequestException('Transaction id is required')
    }

    return this.householdService.deleteSubscriptionTransactionForCurrentUser(user.id, budgetUserId, budgetId, transactionId)
  }

  @Post('user/:id/budget/:budgetId/income')
  createUserIncome(
    @Param('id') budgetUserId: string,
    @Param('budgetId') budgetId: string,
    @Body() input: SaveIncomeDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!budgetUserId) {
      throw new BadRequestException('User id is required')
    }

    if (!budgetId) {
      throw new BadRequestException('Budget id is required')
    }

    return this.householdService.createIncomeForCurrentUser(user.id, budgetUserId, budgetId, input)
  }

  @Get('users/:id/credit-cards')
  userCreditCards(
    @Param('id') budgetUserId: string,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!budgetUserId) {
      throw new BadRequestException('User id is required')
    }

    return this.householdService.listUserCreditCards(user.id, budgetUserId)
  }

  @Get('users/:id/subscriptions')
  userPageSubscriptions(
    @Param('id') budgetUserId: string,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!budgetUserId) {
      throw new BadRequestException('User id is required')
    }

    return this.householdService.listUserSubscriptions(user.id, budgetUserId)
  }

  @Post('users/:id/subscriptions')
  createUserSubscription(
    @Param('id') budgetUserId: string,
    @Body() input: SaveSubscriptionDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!budgetUserId) {
      throw new BadRequestException('User id is required')
    }

    return this.householdService.createUserSubscription(user.id, budgetUserId, input)
  }

  @Patch('subscriptions/:id')
  updateSubscription(
    @Param('id') subscriptionId: string,
    @Body() input: SaveSubscriptionDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!subscriptionId) {
      throw new BadRequestException('Subscription id is required')
    }

    return this.householdService.updateSubscriptionForCurrentUser(user.id, subscriptionId, input)
  }

  @Patch('subscriptions/:id/cancel')
  cancelSubscription(
    @Param('id') subscriptionId: string,
    @Body() input: CancelSubscriptionDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!subscriptionId) {
      throw new BadRequestException('Subscription id is required')
    }

    return this.householdService.cancelSubscriptionForCurrentUser(user.id, subscriptionId, input)
  }

  @Post('users/:id/credit-cards')
  createUserCreditCard(
    @Param('id') budgetUserId: string,
    @Body() input: SaveCreditCardDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!budgetUserId) {
      throw new BadRequestException('User id is required')
    }

    return this.householdService.createUserCreditCard(user.id, budgetUserId, input)
  }

  @Patch('credit-cards/:id')
  updateCreditCard(
    @Param('id') creditCardId: string,
    @Body() input: SaveCreditCardDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!creditCardId) {
      throw new BadRequestException('Credit card id is required')
    }

    return this.householdService.updateCreditCardForCurrentUser(user.id, creditCardId, input)
  }

  @Patch('credit-cards/:id/cancel')
  cancelCreditCard(
    @Param('id') creditCardId: string,
    @Body() input: CancelCreditCardDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!creditCardId) {
      throw new BadRequestException('Credit card id is required')
    }

    return this.householdService.cancelCreditCardForCurrentUser(user.id, creditCardId, input)
  }

  @Patch('credit-cards/:id/balance')
  updateCreditCardBalance(
    @Param('id') creditCardId: string,
    @Body() input: UpdateCreditCardBalanceDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!creditCardId) {
      throw new BadRequestException('Credit card id is required')
    }

    return this.householdService.updateCreditCardBalanceForCurrentUser(user.id, creditCardId, input)
  }
}

function parseBudgetMonthQuery(month: string | undefined, year: string | undefined) {
  const now = new Date()
  const parsedMonth = month === undefined ? now.getUTCMonth() + 1 : Number(month)
  const parsedYear = year === undefined ? now.getUTCFullYear() : Number(year)

  if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    throw new BadRequestException('Month must be a number from 1 to 12')
  }

  if (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 3000) {
    throw new BadRequestException('Year must be a number from 1900 to 3000')
  }

  return {
    month: parsedMonth,
    year: parsedYear
  }
}

function parseDateRangeQuery(fromDate: string | undefined, toDate: string | undefined) {
  if (!fromDate || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
    throw new BadRequestException('from_date must be in YYYY-MM-DD format')
  }

  if (!toDate || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
    throw new BadRequestException('to_date must be in YYYY-MM-DD format')
  }

  if (toDate < fromDate) {
    throw new BadRequestException('to_date must be on or after from_date')
  }

  return {
    fromDate,
    toDate
  }
}

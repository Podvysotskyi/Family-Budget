import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Post, Query, Req } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/request-user'
import { requireRequestUser } from '../auth/request-user'
import type { SaveIncomeDto } from '../income/dto/save-income.dto'
import type { CreateSubscriptionTransactionDto } from '../subscriptions/dto/create-subscription-transaction.dto'
import { HouseholdService } from './households.service'

@Controller()
export class UserBudgetsController {
  constructor(@Inject(HouseholdService) private readonly householdService: HouseholdService) {}

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

    return this.householdService.listSubscriptionsForCurrentUser(user.id, budgetUserId, parseSubscriptionDateRangeQuery(fromDate, toDate))
  }

  @Get('user/:id/budget/:budgetId/transactions')
  userTransactions(
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

    return this.householdService.listBudgetTransactionsForCurrentUser(user.id, budgetUserId, budgetId)
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

function parseSubscriptionDateRangeQuery(fromDate: string | undefined, toDate: string | undefined) {
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

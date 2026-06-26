import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/request-user'
import { requireRequestUser } from '../auth/request-user'
import type { SaveBudgetIncomeDto } from '../budget-income/dto/save-budget-income.dto'
import { HouseholdService } from './households.service'

@Controller('users')
export class UserBudgetsController {
  constructor(@Inject(HouseholdService) private readonly householdService: HouseholdService) {}

  @Get(':id/budget')
  userBudget(
    @Param('id') budgetUserId: string,
    @Query('month') month: string | undefined,
    @Query('year') year: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!budgetUserId) {
      throw new BadRequestException('User id is required')
    }

    return this.householdService.getUserBudgetForCurrentUser(user.id, budgetUserId, parseBudgetMonthQuery(month, year))
  }

  @Get(':id/budget-period/month')
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

  @Get(':id/budget-period/week')
  userBudgetWeekPeriod(
    @Param('id') budgetUserId: string,
    @Query('month') month: string | undefined,
    @Query('year') year: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!budgetUserId) {
      throw new BadRequestException('User id is required')
    }

    return this.householdService.getUserBudgetWeekPeriodForCurrentUser(
      user.id,
      budgetUserId,
      parseBudgetMonthQuery(month, year),
      parseBudgetWeekStartDateQuery(startDate)
    )
  }

  @Get(':id/budget-income')
  userBudgetIncome(
    @Param('id') budgetUserId: string,
    @Query('budgetId') budgetId: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!budgetUserId) {
      throw new BadRequestException('User id is required')
    }

    return this.householdService.listBudgetIncomeForCurrentUser(user.id, budgetUserId, parseBudgetIdQuery(budgetId))
  }

  @Post(':id/budget-income')
  createUserBudgetIncome(
    @Param('id') budgetUserId: string,
    @Body() input: SaveBudgetIncomeDto,
    @Req() request: AuthenticatedRequest
  ) {
    const user = requireRequestUser(request)

    if (!budgetUserId) {
      throw new BadRequestException('User id is required')
    }

    return this.householdService.createBudgetIncomeForCurrentUser(user.id, budgetUserId, input)
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

function parseBudgetWeekStartDateQuery(startDate: string | undefined) {
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw new BadRequestException('Budget period startDate must be in YYYY-MM-DD format')
  }

  return startDate
}

function parseBudgetIdQuery(budgetId: string | undefined) {
  if (!budgetId) {
    throw new BadRequestException('Budget id is required')
  }

  return budgetId
}

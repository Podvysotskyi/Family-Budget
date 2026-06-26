import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/request-user'
import { requireRequestUser } from '../auth/request-user'
import type { SaveIncomeDto } from '../income/dto/save-income.dto'
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

  @Get('users/:id/budget-period/week')
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

function parseBudgetWeekStartDateQuery(startDate: string | undefined) {
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw new BadRequestException('Budget period startDate must be in YYYY-MM-DD format')
  }

  return startDate
}

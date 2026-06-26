import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req } from '@nestjs/common'
import type { AuthenticatedRequest } from '../auth/request-user'
import { requireRequestUser } from '../auth/request-user'
import type { BudgetCategoryReorderDirection } from '../budget-categories/budget-categories.repository'
import type { SaveBudgetCategoryDto } from '../budget-categories/dto/save-budget-category.dto'
import type { SaveIncomeTypeDto } from '../income-types/dto/save-income-type.dto'
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
}

function parseBudgetCategoryDirection(direction: string): BudgetCategoryReorderDirection {
  if (direction === 'up' || direction === 'down') {
    return direction
  }

  throw new BadRequestException('Budget category direction must be up or down')
}

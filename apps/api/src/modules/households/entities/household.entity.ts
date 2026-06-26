import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { BudgetCategoryEntity } from '../../budget-categories/entities/budget-category.entity'
import { BudgetEntity } from '../../budgets/entities/budget.entity'
import { IncomeTypeEntity } from '../../income-types/entities/income-type.entity'
import { UserEntity } from '../../users/entities/user.entity'

@Entity({ name: 'households' })
export class HouseholdEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'text' })
  name!: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @OneToMany(() => UserEntity, user => user.household)
  users!: UserEntity[]

  @OneToMany(() => BudgetEntity, budget => budget.household)
  budgets!: BudgetEntity[]

  @OneToMany(() => BudgetCategoryEntity, budgetCategory => budgetCategory.household)
  budgetCategories!: BudgetCategoryEntity[]

  @OneToMany(() => IncomeTypeEntity, incomeType => incomeType.household)
  incomeTypes!: IncomeTypeEntity[]
}

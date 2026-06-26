import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { BudgetEntity } from '../../budgets/entities/budget.entity'
import { IncomeTypeEntity } from '../../income-types/entities/income-type.entity'
import { UserEntity } from '../../users/entities/user.entity'

const amountTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value)
}

@Entity({ name: 'budget_income' })
@Index('budget_income_budget_id_idx', ['budgetId'])
@Index('budget_income_income_type_id_idx', ['incomeTypeId'])
@Index('budget_income_user_id_idx', ['userId'])
export class BudgetIncomeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'budget_id', type: 'uuid' })
  budgetId!: string

  @Column({ name: 'income_type_id', type: 'uuid' })
  incomeTypeId!: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: amountTransformer })
  amount!: number

  @Column({ type: 'date', nullable: true })
  date!: string | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @ManyToOne(() => BudgetEntity, budget => budget.incomes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget!: BudgetEntity

  @ManyToOne(() => IncomeTypeEntity, incomeType => incomeType.budgetIncomes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'income_type_id' })
  incomeType!: IncomeTypeEntity

  @ManyToOne(() => UserEntity, user => user.budgetIncomes, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity
}

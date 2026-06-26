import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { BudgetIncomeEntity } from '../../budget-income/entities/budget-income.entity'
import { HouseholdEntity } from '../../households/entities/household.entity'
import { BudgetType } from './budget-type'

@Entity({ name: 'budgets' })
@Index('budgets_household_id_idx', ['householdId'])
@Index('budgets_household_type_start_date_unique', ['householdId', 'type', 'startDate'], { unique: true })
export class BudgetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'household_id', type: 'uuid' })
  householdId!: string

  @Column({
    type: 'enum',
    enum: BudgetType,
    enumName: 'budget_type'
  })
  type!: BudgetType

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @ManyToOne(() => HouseholdEntity, household => household.budgets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'household_id' })
  household!: HouseholdEntity

  @OneToMany(() => BudgetIncomeEntity, income => income.budget)
  incomes!: BudgetIncomeEntity[]
}

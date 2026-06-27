import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { HouseholdEntity } from '../../households/entities/household.entity'

export enum BudgetCategoryType {
  Subscriptions = 'subscriptions',
  Bills = 'bills',
  CreditCards = 'credit_cards',
  Goals = 'goals',
  Other = 'other'
}

@Entity({ name: 'budget_categories' })
@Index('budget_categories_household_id_idx', ['householdId'])
@Index('budget_categories_household_name_unique', ['householdId', 'name'], { unique: true })
@Index('budget_categories_household_order_unique', ['householdId', 'order'], { unique: true })
export class BudgetCategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'household_id', type: 'uuid' })
  householdId!: string

  @Column({ type: 'text' })
  name!: string

  @Column({ enum: BudgetCategoryType, enumName: 'budget_category_type', nullable: true, type: 'enum' })
  type!: BudgetCategoryType | null

  @Column({ type: 'integer' })
  order!: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @ManyToOne(() => HouseholdEntity, household => household.budgetCategories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'household_id' })
  household!: HouseholdEntity
}

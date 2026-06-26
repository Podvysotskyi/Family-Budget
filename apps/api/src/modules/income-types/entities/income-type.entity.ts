import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { IncomeEntity } from '../../income/entities/income.entity'
import { HouseholdEntity } from '../../households/entities/household.entity'

@Entity({ name: 'income_types' })
@Index('income_types_household_id_idx', ['householdId'])
@Index('income_types_household_text_unique', ['householdId', 'text'], { unique: true })
export class IncomeTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'household_id', type: 'uuid' })
  householdId!: string

  @Column({ type: 'text' })
  text!: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @ManyToOne(() => HouseholdEntity, household => household.incomeTypes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'household_id' })
  household!: HouseholdEntity

  @OneToMany(() => IncomeEntity, income => income.incomeType)
  incomes!: IncomeEntity[]
}

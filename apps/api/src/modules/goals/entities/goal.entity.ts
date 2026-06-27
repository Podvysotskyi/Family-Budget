import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { HouseholdEntity } from '../../households/entities/household.entity'
import { UserEntity } from '../../users/entities/user.entity'
import { GoalTargetEntity } from './goal-target.entity'
import { GoalTransactionEntity } from './goal-transaction.entity'

@Entity({ name: 'goals' })
@Index('goals_household_id_idx', ['householdId'])
@Index('goals_user_id_idx', ['userId'])
export class GoalEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'household_id', type: 'uuid' })
  householdId!: string

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null

  @Column({ type: 'text' })
  name!: string

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null

  @Column({ name: 'include_in_budget', type: 'boolean', default: true })
  includeInBudget!: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @ManyToOne(() => HouseholdEntity, household => household.goals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'household_id' })
  household!: HouseholdEntity

  @ManyToOne(() => UserEntity, user => user.goals, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity | null

  @OneToMany(() => GoalTargetEntity, goalTarget => goalTarget.goal)
  targets!: GoalTargetEntity[]

  @OneToMany(() => GoalTransactionEntity, goalTransaction => goalTransaction.goal)
  transactions!: GoalTransactionEntity[]
}

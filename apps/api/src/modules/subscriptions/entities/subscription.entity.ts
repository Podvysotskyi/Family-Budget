import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'
import { HouseholdEntity } from '../../households/entities/household.entity'
import { UserEntity } from '../../users/entities/user.entity'
import { SubscriptionType } from './subscription-type'

const amountTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value)
}

@Entity({ name: 'subscriptions' })
@Index('subscriptions_household_id_idx', ['householdId'])
@Index('subscriptions_user_id_idx', ['userId'])
@Index('subscriptions_household_name_user_unique', ['householdId', 'name', 'userId'], { unique: true, where: '"user_id" IS NOT NULL' })
@Index('subscriptions_household_name_unassigned_unique', ['householdId', 'name'], { unique: true, where: '"user_id" IS NULL' })
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'household_id', type: 'uuid' })
  householdId!: string

  @Column({ type: 'text' })
  name!: string

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null

  @Column({ type: 'enum', enum: SubscriptionType, enumName: 'subscription_type' })
  type!: SubscriptionType

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: amountTransformer })
  amount!: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @ManyToOne(() => HouseholdEntity, household => household.subscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'household_id' })
  household!: HouseholdEntity

  @ManyToOne(() => UserEntity, user => user.subscriptions, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity | null
}

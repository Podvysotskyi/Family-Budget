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
import { SubscriptionAmountEntity } from './subscription-amount.entity'
import { SubscriptionDueDateEntity } from './subscription-due-date.entity'
import { SubscriptionTransactionEntity } from './subscription-transaction.entity'
import { SubscriptionType } from './subscription-type'

@Entity({ name: 'subscriptions' })
@Index('subscriptions_household_id_idx', ['householdId'])
@Index('subscriptions_user_id_idx', ['userId'])
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

  @Column({ type: 'boolean', default: false })
  autopay!: boolean

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

  @OneToMany(() => SubscriptionTransactionEntity, subscriptionTransaction => subscriptionTransaction.subscription)
  transactions!: SubscriptionTransactionEntity[]

  @OneToMany(() => SubscriptionAmountEntity, subscriptionAmount => subscriptionAmount.subscription)
  amounts!: SubscriptionAmountEntity[]

  @OneToMany(() => SubscriptionDueDateEntity, subscriptionDate => subscriptionDate.subscription)
  dates!: SubscriptionDueDateEntity[]
}

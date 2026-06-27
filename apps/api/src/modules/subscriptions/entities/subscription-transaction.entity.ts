import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { UserEntity } from '../../users/entities/user.entity'
import { BudgetSubscriptionTransactionEntity } from './budget-subscription-transaction.entity'
import { SubscriptionEntity } from './subscription.entity'

const amountTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value)
}

@Entity({ name: 'subscription_transactions' })
@Index('subscription_transactions_subscription_id_idx', ['subscriptionId'])
@Index('subscription_transactions_user_id_idx', ['userId'])
export class SubscriptionTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'subscription_id', type: 'uuid' })
  subscriptionId!: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: amountTransformer })
  amount!: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @ManyToOne(() => SubscriptionEntity, subscription => subscription.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription!: SubscriptionEntity

  @ManyToOne(() => UserEntity, user => user.subscriptionTransactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity

  @OneToMany(() => BudgetSubscriptionTransactionEntity, budgetSubscriptionTransaction => budgetSubscriptionTransaction.subscriptionTransaction)
  budgetTransactions!: BudgetSubscriptionTransactionEntity[]
}

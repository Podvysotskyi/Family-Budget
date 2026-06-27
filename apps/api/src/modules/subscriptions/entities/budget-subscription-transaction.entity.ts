import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { BudgetEntity } from '../../budgets/entities/budget.entity'
import { SubscriptionTransactionEntity } from './subscription-transaction.entity'

@Entity({ name: 'budget_subscription_transactions' })
@Index('bst_budget_id_idx', ['budgetId'])
@Index('bst_subscription_transaction_id_idx', ['subscriptionTransactionId'])
@Index('bst_subscription_transaction_budget_unique', ['subscriptionTransactionId', 'budgetId'], { unique: true })
export class BudgetSubscriptionTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'subscription_transaction_id', type: 'uuid' })
  subscriptionTransactionId!: string

  @Column({ name: 'budget_id', type: 'uuid' })
  budgetId!: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @ManyToOne(() => SubscriptionTransactionEntity, subscriptionTransaction => subscriptionTransaction.budgetTransactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_transaction_id' })
  subscriptionTransaction!: SubscriptionTransactionEntity

  @ManyToOne(() => BudgetEntity, budget => budget.subscriptionTransactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'budget_id' })
  budget!: BudgetEntity
}

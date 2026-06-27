import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { UserEntity } from '../../users/entities/user.entity'
import { GoalEntity } from './goal.entity'

const amountTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value)
}

@Entity({ name: 'goal_transactions' })
@Index('goal_transactions_goal_id_idx', ['goalId'])
@Index('goal_transactions_user_id_idx', ['userId'])
@Index('goal_transactions_goal_date_idx', ['goalId', 'date'])
export class GoalTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'goal_id', type: 'uuid' })
  goalId!: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string

  @Column({ type: 'date' })
  date!: string

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: amountTransformer })
  amount!: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @ManyToOne(() => GoalEntity, goal => goal.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goal_id' })
  goal!: GoalEntity

  @ManyToOne(() => UserEntity, user => user.goalTransactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity
}

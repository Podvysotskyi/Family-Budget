import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { GoalEntity } from './goal.entity'
import { GoalTargetType } from './goal-target-type'

const amountTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value)
}

@Entity({ name: 'goal_targets' })
@Index('goal_targets_goal_id_idx', ['goalId'])
@Index('goal_targets_goal_date_unique', ['goalId', 'date'], { unique: true })
export class GoalTargetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'goal_id', type: 'uuid' })
  goalId!: string

  @Column({ type: 'date' })
  date!: string

  @Column({ type: 'enum', enum: GoalTargetType, enumName: 'goal_target_type' })
  type!: GoalTargetType

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: amountTransformer })
  amount!: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @ManyToOne(() => GoalEntity, goal => goal.targets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goal_id' })
  goal!: GoalEntity
}

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { IncomeTypeEntity } from '../../income-types/entities/income-type.entity'
import { UserEntity } from '../../users/entities/user.entity'

const amountTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value)
}

@Entity({ name: 'income' })
@Index('income_income_type_id_idx', ['incomeTypeId'])
@Index('income_user_id_idx', ['userId'])
@Index('income_user_date_idx', ['userId', 'date'])
export class IncomeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'income_type_id', type: 'uuid' })
  incomeTypeId!: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: amountTransformer })
  amount!: number

  @Column({ type: 'date' })
  date!: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @ManyToOne(() => IncomeTypeEntity, incomeType => incomeType.incomes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'income_type_id' })
  incomeType!: IncomeTypeEntity

  @ManyToOne(() => UserEntity, user => user.incomes, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity
}

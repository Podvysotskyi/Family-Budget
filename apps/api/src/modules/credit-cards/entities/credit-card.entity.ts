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
import { CreditCardBalanceEntity } from './credit-card-balance.entity'
import { CreditCardLimitEntity } from './credit-card-limit.entity'

@Entity({ name: 'credit_cards' })
@Index('credit_cards_household_id_idx', ['householdId'])
@Index('credit_cards_user_id_idx', ['userId'])
export class CreditCardEntity {
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

  @Column({ name: 'due_date', type: 'date' })
  dueDate!: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @ManyToOne(() => HouseholdEntity, household => household.creditCards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'household_id' })
  household!: HouseholdEntity

  @ManyToOne(() => UserEntity, user => user.creditCards, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity | null

  @OneToMany(() => CreditCardBalanceEntity, balance => balance.creditCard)
  balances!: CreditCardBalanceEntity[]

  @OneToMany(() => CreditCardLimitEntity, limit => limit.creditCard)
  limits!: CreditCardLimitEntity[]
}

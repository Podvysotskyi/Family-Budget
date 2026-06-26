import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { HouseholdEntity } from '../../households/entities/household.entity'
import { IncomeEntity } from '../../income/entities/income.entity'

@Entity({ name: 'users' })
@Index('users_email_unique', ['email'], { unique: true })
@Index('users_google_id_unique', ['googleId'], { unique: true })
@Index('users_household_id_idx', ['householdId'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'text' })
  email!: string

  @Column({ type: 'text', nullable: true })
  name!: string | null

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null

  @Column({ name: 'google_id', type: 'text', nullable: true })
  googleId!: string | null

  @Column({ name: 'household_id', type: 'uuid' })
  householdId!: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @ManyToOne(() => HouseholdEntity, household => household.users, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'household_id' })
  household!: HouseholdEntity

  @OneToMany(() => IncomeEntity, income => income.user)
  incomes!: IncomeEntity[]
}

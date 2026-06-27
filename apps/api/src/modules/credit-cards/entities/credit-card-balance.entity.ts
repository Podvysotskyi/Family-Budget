import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { CreditCardEntity } from './credit-card.entity'

const amountTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value)
}

@Entity({ name: 'credit_card_balances' })
@Index('credit_card_balances_credit_card_id_idx', ['creditCardId'])
@Index('credit_card_balances_credit_card_date_unique', ['creditCardId', 'date'], { unique: true })
export class CreditCardBalanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ name: 'credit_card_id', type: 'uuid' })
  creditCardId!: string

  @Column({ type: 'date' })
  date!: string

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: amountTransformer })
  balance!: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date

  @ManyToOne(() => CreditCardEntity, creditCard => creditCard.balances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'credit_card_id' })
  creditCard!: CreditCardEntity
}

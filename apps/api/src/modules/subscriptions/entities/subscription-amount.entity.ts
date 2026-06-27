import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { SubscriptionEntity } from './subscription.entity'

const amountTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value)
}

@Entity({ name: 'subscription_amounts' })
@Index('subscription_amounts_subscription_id_idx', ['subscriptionId'])
export class SubscriptionAmountEntity {
  @PrimaryColumn({ name: 'subscription_id', type: 'uuid' })
  subscriptionId!: string

  @PrimaryColumn({ type: 'date' })
  date!: string

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: amountTransformer })
  amount!: number

  @ManyToOne(() => SubscriptionEntity, subscription => subscription.amounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription!: SubscriptionEntity
}

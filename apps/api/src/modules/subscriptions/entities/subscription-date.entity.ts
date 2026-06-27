import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { SubscriptionEntity } from './subscription.entity'

@Entity({ name: 'subscription_dates' })
@Index('subscription_dates_subscription_id_idx', ['subscriptionId'])
@Index('subscription_dates_date_idx', ['date'])
export class SubscriptionDateEntity {
  @PrimaryColumn({ name: 'subscription_id', type: 'uuid' })
  subscriptionId!: string

  @PrimaryColumn({ type: 'date' })
  date!: string

  @ManyToOne(() => SubscriptionEntity, subscription => subscription.dates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription!: SubscriptionEntity
}

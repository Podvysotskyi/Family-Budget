import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSubscriptionTransactions1782530137343 implements MigrationInterface {
  name = 'AddSubscriptionTransactions1782530137343'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "subscription_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "subscription_id" uuid NOT NULL, "user_id" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "date" date NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b8a90f16868b06508776988e16e" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE UNIQUE INDEX "subscription_transactions_subscription_date_unique" ON "subscription_transactions"  ("subscription_id", "date") `)
    await queryRunner.query(`CREATE INDEX "subscription_transactions_user_id_idx" ON "subscription_transactions"  ("user_id") `)
    await queryRunner.query(`CREATE INDEX "subscription_transactions_subscription_id_idx" ON "subscription_transactions"  ("subscription_id") `)
    await queryRunner.query(`ALTER TABLE "subscription_transactions" ADD CONSTRAINT "FK_87972f688732a2251f2bcd9f886" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "subscription_transactions" ADD CONSTRAINT "FK_a60db7f20c3f07ab6ceaa5a86a2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscription_transactions" DROP CONSTRAINT "FK_a60db7f20c3f07ab6ceaa5a86a2"`)
    await queryRunner.query(`ALTER TABLE "subscription_transactions" DROP CONSTRAINT "FK_87972f688732a2251f2bcd9f886"`)
    await queryRunner.query(`DROP INDEX "public"."subscription_transactions_subscription_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."subscription_transactions_user_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."subscription_transactions_subscription_date_unique"`)
    await queryRunner.query(`DROP TABLE "subscription_transactions"`)
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSubscriptionTransactions1782530137343 implements MigrationInterface {
  name = 'AddSubscriptionTransactions1782530137343'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "subscription_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "subscription_id" uuid NOT NULL, "user_id" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b8a90f16868b06508776988e16e" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "subscription_transactions_user_id_idx" ON "subscription_transactions"  ("user_id") `)
    await queryRunner.query(`CREATE INDEX "subscription_transactions_subscription_id_idx" ON "subscription_transactions"  ("subscription_id") `)
    await queryRunner.query(`CREATE TABLE "budget_subscription_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "subscription_transaction_id" uuid NOT NULL, "budget_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_eea8f48354280b08b7702f929ae" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE UNIQUE INDEX "bst_subscription_transaction_budget_unique" ON "budget_subscription_transactions"  ("subscription_transaction_id", "budget_id") `)
    await queryRunner.query(`CREATE INDEX "bst_subscription_transaction_id_idx" ON "budget_subscription_transactions"  ("subscription_transaction_id") `)
    await queryRunner.query(`CREATE INDEX "bst_budget_id_idx" ON "budget_subscription_transactions"  ("budget_id") `)
    await queryRunner.query(`ALTER TABLE "subscription_transactions" ADD CONSTRAINT "FK_87972f688732a2251f2bcd9f886" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "subscription_transactions" ADD CONSTRAINT "FK_a60db7f20c3f07ab6ceaa5a86a2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "budget_subscription_transactions" ADD CONSTRAINT "FK_92c2f0b8bd1f5989f67de5ddb50" FOREIGN KEY ("subscription_transaction_id") REFERENCES "subscription_transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "budget_subscription_transactions" ADD CONSTRAINT "FK_c1a41bb77948a0261cbab53d6fe" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "budget_subscription_transactions" DROP CONSTRAINT "FK_c1a41bb77948a0261cbab53d6fe"`)
    await queryRunner.query(`ALTER TABLE "budget_subscription_transactions" DROP CONSTRAINT "FK_92c2f0b8bd1f5989f67de5ddb50"`)
    await queryRunner.query(`ALTER TABLE "subscription_transactions" DROP CONSTRAINT "FK_a60db7f20c3f07ab6ceaa5a86a2"`)
    await queryRunner.query(`ALTER TABLE "subscription_transactions" DROP CONSTRAINT "FK_87972f688732a2251f2bcd9f886"`)
    await queryRunner.query(`DROP INDEX "public"."bst_budget_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."bst_subscription_transaction_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."bst_subscription_transaction_budget_unique"`)
    await queryRunner.query(`DROP TABLE "budget_subscription_transactions"`)
    await queryRunner.query(`DROP INDEX "public"."subscription_transactions_subscription_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."subscription_transactions_user_id_idx"`)
    await queryRunner.query(`DROP TABLE "subscription_transactions"`)
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm'

export class StoreSubscriptionTransactionDates1782533000000 implements MigrationInterface {
  name = 'StoreSubscriptionTransactionDates1782533000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscription_transactions" ADD COLUMN IF NOT EXISTS "date" date`)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF to_regclass('public.budget_subscription_transactions') IS NOT NULL THEN
          UPDATE "subscription_transactions" AS "subscriptionTransaction"
          SET "date" = "occurrence"."date"
          FROM (
            SELECT DISTINCT ON ("subscriptionTransaction"."id")
              "subscriptionTransaction"."id",
              "occurrenceDate"."date"::date AS "date"
            FROM "subscription_transactions" AS "subscriptionTransaction"
            INNER JOIN "subscriptions" AS "subscription"
              ON "subscription"."id" = "subscriptionTransaction"."subscription_id"
            INNER JOIN "budget_subscription_transactions" AS "budgetSubscriptionTransaction"
              ON "budgetSubscriptionTransaction"."subscription_transaction_id" = "subscriptionTransaction"."id"
            INNER JOIN "budgets" AS "budget"
              ON "budget"."id" = "budgetSubscriptionTransaction"."budget_id"
            CROSS JOIN LATERAL generate_series("budget"."start_date", "budget"."end_date", interval '1 day') AS "occurrenceDate"("date")
            WHERE "occurrenceDate"."date"::date >= "subscription"."start_date"
              AND ("subscription"."end_date" IS NULL OR "occurrenceDate"."date"::date <= "subscription"."end_date")
              AND (
                (
                  "subscription"."type" = 'monthly'
                  AND EXTRACT(DAY FROM "occurrenceDate"."date") = EXTRACT(DAY FROM "subscription"."start_date")
                )
                OR (
                  "subscription"."type" = 'yearly'
                  AND EXTRACT(MONTH FROM "occurrenceDate"."date") = EXTRACT(MONTH FROM "subscription"."start_date")
                  AND EXTRACT(DAY FROM "occurrenceDate"."date") = EXTRACT(DAY FROM "subscription"."start_date")
                )
              )
            ORDER BY "subscriptionTransaction"."id", "occurrenceDate"."date"
          ) AS "occurrence"
          WHERE "subscriptionTransaction"."id" = "occurrence"."id"
            AND "subscriptionTransaction"."date" IS NULL;
        END IF;
      END $$;
    `)
    await queryRunner.query(`UPDATE "subscription_transactions" SET "date" = "created_at"::date WHERE "date" IS NULL`)
    await queryRunner.query(`ALTER TABLE "subscription_transactions" ALTER COLUMN "date" SET NOT NULL`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "subscription_transactions_subscription_date_unique" ON "subscription_transactions" ("subscription_id", "date")`)
    await queryRunner.query(`DROP TABLE IF EXISTS "budget_subscription_transactions"`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "budget_subscription_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "subscription_transaction_id" uuid NOT NULL, "budget_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_eea8f48354280b08b7702f929ae" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "bst_subscription_transaction_budget_unique" ON "budget_subscription_transactions" ("subscription_transaction_id", "budget_id")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "bst_subscription_transaction_id_idx" ON "budget_subscription_transactions" ("subscription_transaction_id")`)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "bst_budget_id_idx" ON "budget_subscription_transactions" ("budget_id")`)
    await queryRunner.query(`ALTER TABLE "budget_subscription_transactions" ADD CONSTRAINT "FK_92c2f0b8bd1f5989f67de5ddb50" FOREIGN KEY ("subscription_transaction_id") REFERENCES "subscription_transactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "budget_subscription_transactions" ADD CONSTRAINT "FK_c1a41bb77948a0261cbab53d6fe" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."subscription_transactions_subscription_date_unique"`)
    await queryRunner.query(`ALTER TABLE "subscription_transactions" DROP COLUMN IF EXISTS "date"`)
  }
}

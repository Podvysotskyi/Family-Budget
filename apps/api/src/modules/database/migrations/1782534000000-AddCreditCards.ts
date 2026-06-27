import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddCreditCards1782534000000 implements MigrationInterface {
  name = 'AddCreditCards1782534000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "credit_cards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "household_id" uuid NOT NULL, "user_id" uuid, "name" text NOT NULL, "start_date" date NOT NULL, "end_date" date, "due_date" date NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_186d111bfca37a2d0f86c2bcda1" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE INDEX "credit_cards_user_id_idx" ON "credit_cards" ("user_id")`)
    await queryRunner.query(`CREATE INDEX "credit_cards_household_id_idx" ON "credit_cards" ("household_id")`)
    await queryRunner.query(`CREATE TABLE "credit_card_balances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "credit_card_id" uuid NOT NULL, "date" date NOT NULL, "balance" numeric(12,2) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c5d853d6059dfca074d5133f695" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE UNIQUE INDEX "credit_card_balances_credit_card_date_unique" ON "credit_card_balances" ("credit_card_id", "date")`)
    await queryRunner.query(`CREATE INDEX "credit_card_balances_credit_card_id_idx" ON "credit_card_balances" ("credit_card_id")`)
    await queryRunner.query(`CREATE TABLE "credit_card_limits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "credit_card_id" uuid NOT NULL, "date" date NOT NULL, "limit" numeric(12,2) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ab7f92942006ee0c7a174a59b4a" PRIMARY KEY ("id"))`)
    await queryRunner.query(`CREATE UNIQUE INDEX "credit_card_limits_credit_card_date_unique" ON "credit_card_limits" ("credit_card_id", "date")`)
    await queryRunner.query(`CREATE INDEX "credit_card_limits_credit_card_id_idx" ON "credit_card_limits" ("credit_card_id")`)
    await queryRunner.query(`ALTER TABLE "credit_cards" ADD CONSTRAINT "FK_ba5f5608a17ff27a59088fe3e27" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "credit_cards" ADD CONSTRAINT "FK_2d588ac529ce3b8a45069716bdd" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "credit_card_balances" ADD CONSTRAINT "FK_ddbe6b7697436de0034be9abcc2" FOREIGN KEY ("credit_card_id") REFERENCES "credit_cards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "credit_card_limits" ADD CONSTRAINT "FK_b8884489e1b9c25918d5b975218" FOREIGN KEY ("credit_card_id") REFERENCES "credit_cards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "credit_card_limits" DROP CONSTRAINT "FK_b8884489e1b9c25918d5b975218"`)
    await queryRunner.query(`ALTER TABLE "credit_card_balances" DROP CONSTRAINT "FK_ddbe6b7697436de0034be9abcc2"`)
    await queryRunner.query(`ALTER TABLE "credit_cards" DROP CONSTRAINT "FK_2d588ac529ce3b8a45069716bdd"`)
    await queryRunner.query(`ALTER TABLE "credit_cards" DROP CONSTRAINT "FK_ba5f5608a17ff27a59088fe3e27"`)
    await queryRunner.query(`DROP INDEX "public"."credit_card_limits_credit_card_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."credit_card_limits_credit_card_date_unique"`)
    await queryRunner.query(`DROP TABLE "credit_card_limits"`)
    await queryRunner.query(`DROP INDEX "public"."credit_card_balances_credit_card_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."credit_card_balances_credit_card_date_unique"`)
    await queryRunner.query(`DROP TABLE "credit_card_balances"`)
    await queryRunner.query(`DROP INDEX "public"."credit_cards_household_id_idx"`)
    await queryRunner.query(`DROP INDEX "public"."credit_cards_user_id_idx"`)
    await queryRunner.query(`DROP TABLE "credit_cards"`)
  }
}

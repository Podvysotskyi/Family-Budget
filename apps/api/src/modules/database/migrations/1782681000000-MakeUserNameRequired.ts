import type { MigrationInterface, QueryRunner } from 'typeorm'

export class MakeUserNameRequired1782681000000 implements MigrationInterface {
  name = 'MakeUserNameRequired1782681000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "users" SET "name" = "email" WHERE "name" IS NULL OR btrim("name") = ''`)
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL`)
  }
}

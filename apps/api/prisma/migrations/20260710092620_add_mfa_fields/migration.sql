-- AlterTable
ALTER TABLE "user" ADD COLUMN     "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfa_secret" VARCHAR(512);

-- AlterTable: add hideOutOfStock to StoreConfig
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "hideOutOfStock" BOOLEAN NOT NULL DEFAULT false;

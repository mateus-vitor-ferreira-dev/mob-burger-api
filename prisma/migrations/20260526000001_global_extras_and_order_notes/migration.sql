-- CreateTable GlobalExtra
CREATE TABLE "GlobalExtra" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "GlobalExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable OrderItemGlobalExtra
CREATE TABLE "OrderItemGlobalExtra" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "extraId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "OrderItemGlobalExtra_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrderItemGlobalExtra_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE,
    CONSTRAINT "OrderItemGlobalExtra_extraId_fkey" FOREIGN KEY ("extraId") REFERENCES "GlobalExtra"("id")
);

-- AlterTable Order: add notes
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "notes" TEXT;

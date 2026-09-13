-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "loggedManually" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "OrderClaim" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderClaim_orderId_idx" ON "OrderClaim"("orderId");

-- CreateIndex
CREATE INDEX "OrderClaim_riderId_idx" ON "OrderClaim"("riderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderClaim_orderId_riderId_key" ON "OrderClaim"("orderId", "riderId");

-- AddForeignKey
ALTER TABLE "OrderClaim" ADD CONSTRAINT "OrderClaim_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderClaim" ADD CONSTRAINT "OrderClaim_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "Rider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

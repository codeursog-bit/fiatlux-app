-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('SELF', 'THIRD_PARTY');

-- CreateEnum
CREATE TYPE "PickupControlMode" AS ENUM ('AUTO', 'MANUAL');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryType" "DeliveryType" NOT NULL DEFAULT 'THIRD_PARTY',
ADD COLUMN     "pickupControlMode" "PickupControlMode";

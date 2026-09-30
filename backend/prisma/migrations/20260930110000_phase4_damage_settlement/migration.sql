-- CreateEnum
CREATE TYPE "DamageSettlementStatus" AS ENUM ('OPEN', 'SETTLED', 'WAIVED');

-- AlterTable
ALTER TABLE "DamageRecord" ADD COLUMN "settlementStatus" "DamageSettlementStatus" NOT NULL DEFAULT 'OPEN';
ALTER TABLE "DamageRecord" ADD COLUMN "settledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "DamageRecord_tenantId_settlementStatus_idx" ON "DamageRecord"("tenantId", "settlementStatus");

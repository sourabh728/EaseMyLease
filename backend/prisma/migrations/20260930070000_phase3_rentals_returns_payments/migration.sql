-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM (
  'DRAFT',
  'CONFIRMED',
  'ACTIVE',
  'RETURN_PENDING',
  'COMPLETED',
  'CANCELLED',
  'OVERDUE'
);

-- CreateEnum
CREATE TYPE "ReturnCondition" AS ENUM (
  'GOOD',
  'MINOR_DAMAGE',
  'MAJOR_DAMAGE',
  'MISSING_ACCESSORY',
  'LOST'
);

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM (
  'RENT',
  'DEPOSIT',
  'LATE_FEE',
  'DAMAGE_CHARGE',
  'REFUND'
);

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM (
  'CASH',
  'UPI',
  'CARD',
  'BANK_TRANSFER'
);

-- CreateTable
CREATE TABLE "Rental" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rentalNumber" TEXT NOT NULL,
    "rentalStartDate" TIMESTAMP(3) NOT NULL,
    "expectedReturnDate" TIMESTAMP(3) NOT NULL,
    "actualReturnDate" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalRent" DECIMAL(12,2) NOT NULL,
    "totalDeposit" DECIMAL(12,2) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(12,2) NOT NULL,
    "status" "RentalStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "rentalPrice" DECIMAL(12,2) NOT NULL,
    "deposit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "conditionAtRelease" TEXT,
    "conditionAtReturn" TEXT,
    "notes" TEXT,

    CONSTRAINT "RentalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalReturn" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lateFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentalReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalReturnItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "rentalItemId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "condition" "ReturnCondition" NOT NULL,
    "damageNotes" TEXT,
    "missingAccessories" TEXT,
    "stains" BOOLEAN NOT NULL DEFAULT false,
    "isLost" BOOLEAN NOT NULL DEFAULT false,
    "additionalCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "photoUrls" JSONB,

    CONSTRAINT "RentalReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "returnId" TEXT,
    "rentalItemId" TEXT,
    "inventoryItemId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "chargeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "photoUrls" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DamageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "transactionRef" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rental_tenantId_rentalNumber_key" ON "Rental"("tenantId", "rentalNumber");

-- CreateIndex
CREATE INDEX "Rental_tenantId_idx" ON "Rental"("tenantId");

-- CreateIndex
CREATE INDEX "Rental_tenantId_status_idx" ON "Rental"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Rental_tenantId_customerId_idx" ON "Rental"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Rental_tenantId_rentalStartDate_idx" ON "Rental"("tenantId", "rentalStartDate");

-- CreateIndex
CREATE INDEX "Rental_tenantId_expectedReturnDate_idx" ON "Rental"("tenantId", "expectedReturnDate");

-- CreateIndex
CREATE INDEX "Rental_status_idx" ON "Rental"("status");

-- CreateIndex
CREATE INDEX "RentalItem_tenantId_idx" ON "RentalItem"("tenantId");

-- CreateIndex
CREATE INDEX "RentalItem_rentalId_idx" ON "RentalItem"("rentalId");

-- CreateIndex
CREATE INDEX "RentalItem_inventoryItemId_idx" ON "RentalItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "RentalItem_tenantId_inventoryItemId_idx" ON "RentalItem"("tenantId", "inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalItem_rentalId_inventoryItemId_key" ON "RentalItem"("rentalId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "RentalReturn_tenantId_idx" ON "RentalReturn"("tenantId");

-- CreateIndex
CREATE INDEX "RentalReturn_rentalId_idx" ON "RentalReturn"("rentalId");

-- CreateIndex
CREATE INDEX "RentalReturn_tenantId_returnDate_idx" ON "RentalReturn"("tenantId", "returnDate");

-- CreateIndex
CREATE INDEX "RentalReturnItem_tenantId_idx" ON "RentalReturnItem"("tenantId");

-- CreateIndex
CREATE INDEX "RentalReturnItem_returnId_idx" ON "RentalReturnItem"("returnId");

-- CreateIndex
CREATE INDEX "RentalReturnItem_rentalItemId_idx" ON "RentalReturnItem"("rentalItemId");

-- CreateIndex
CREATE INDEX "RentalReturnItem_inventoryItemId_idx" ON "RentalReturnItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "DamageRecord_tenantId_idx" ON "DamageRecord"("tenantId");

-- CreateIndex
CREATE INDEX "DamageRecord_rentalId_idx" ON "DamageRecord"("rentalId");

-- CreateIndex
CREATE INDEX "DamageRecord_returnId_idx" ON "DamageRecord"("returnId");

-- CreateIndex
CREATE INDEX "DamageRecord_inventoryItemId_idx" ON "DamageRecord"("inventoryItemId");

-- CreateIndex
CREATE INDEX "DamageRecord_tenantId_rentalId_idx" ON "DamageRecord"("tenantId", "rentalId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");

-- CreateIndex
CREATE INDEX "Payment_rentalId_idx" ON "Payment"("rentalId");

-- CreateIndex
CREATE INDEX "Payment_tenantId_paymentDate_idx" ON "Payment"("tenantId", "paymentDate");

-- CreateIndex
CREATE INDEX "Payment_tenantId_paymentType_idx" ON "Payment"("tenantId", "paymentType");

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalItem" ADD CONSTRAINT "RentalItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalItem" ADD CONSTRAINT "RentalItem_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalItem" ADD CONSTRAINT "RentalItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReturn" ADD CONSTRAINT "RentalReturn_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReturn" ADD CONSTRAINT "RentalReturn_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalReturnItem" ADD CONSTRAINT "RentalReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "RentalReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageRecord" ADD CONSTRAINT "DamageRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageRecord" ADD CONSTRAINT "DamageRecord_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageRecord" ADD CONSTRAINT "DamageRecord_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "RentalReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageRecord" ADD CONSTRAINT "DamageRecord_rentalItemId_fkey" FOREIGN KEY ("rentalItemId") REFERENCES "RentalItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageRecord" ADD CONSTRAINT "DamageRecord_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

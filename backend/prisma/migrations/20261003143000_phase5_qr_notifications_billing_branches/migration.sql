-- Phase 5: subscription fields, optional shopId, notification logs

CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'BASIC', 'PRO');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED');
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');
CREATE TYPE "NotificationType" AS ENUM ('RENTAL_DUE_TODAY', 'RENTAL_OVERDUE', 'RENTAL_RECEIPT');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

ALTER TABLE "Tenant"
  ADD COLUMN "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);

-- Optional branch association (backfill to each tenant's first shop)
ALTER TABLE "InventoryItem" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "shopId" TEXT;
ALTER TABLE "Rental" ADD COLUMN "shopId" TEXT;

UPDATE "InventoryItem" i
SET "shopId" = s.id
FROM (
  SELECT DISTINCT ON ("tenantId") id, "tenantId"
  FROM "Shop"
  ORDER BY "tenantId", "createdAt" ASC
) s
WHERE i."tenantId" = s."tenantId" AND i."shopId" IS NULL;

UPDATE "Customer" c
SET "shopId" = s.id
FROM (
  SELECT DISTINCT ON ("tenantId") id, "tenantId"
  FROM "Shop"
  ORDER BY "tenantId", "createdAt" ASC
) s
WHERE c."tenantId" = s."tenantId" AND c."shopId" IS NULL;

UPDATE "Rental" r
SET "shopId" = s.id
FROM (
  SELECT DISTINCT ON ("tenantId") id, "tenantId"
  FROM "Shop"
  ORDER BY "tenantId", "createdAt" ASC
) s
WHERE r."tenantId" = s."tenantId" AND r."shopId" IS NULL;

ALTER TABLE "InventoryItem"
  ADD CONSTRAINT "InventoryItem_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Rental"
  ADD CONSTRAINT "Rental_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "InventoryItem_tenantId_shopId_idx" ON "InventoryItem"("tenantId", "shopId");
CREATE INDEX "Customer_tenantId_shopId_idx" ON "Customer"("tenantId", "shopId");
CREATE INDEX "Rental_tenantId_shopId_idx" ON "Rental"("tenantId", "shopId");

CREATE TABLE "NotificationLog" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "recipient" TEXT NOT NULL,
  "rentalId" TEXT,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'SENT',
  "dayKey" TEXT NOT NULL,
  "errorMessage" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationLog_tenantId_rentalId_type_channel_dayKey_key"
  ON "NotificationLog"("tenantId", "rentalId", "type", "channel", "dayKey");

CREATE INDEX "NotificationLog_tenantId_idx" ON "NotificationLog"("tenantId");
CREATE INDEX "NotificationLog_tenantId_type_dayKey_idx" ON "NotificationLog"("tenantId", "type", "dayKey");
CREATE INDEX "NotificationLog_rentalId_idx" ON "NotificationLog"("rentalId");

ALTER TABLE "NotificationLog"
  ADD CONSTRAINT "NotificationLog_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationLog"
  ADD CONSTRAINT "NotificationLog_rentalId_fkey"
  FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed trial window for existing tenants (14 days from now if unset)
UPDATE "Tenant"
SET "trialEndsAt" = NOW() + INTERVAL '14 days'
WHERE "trialEndsAt" IS NULL;

-- Add business purchasing, product specifications, order approval,
-- and technician workflow fields. Existing Vendor and Distributor tables
-- are intentionally unchanged.

ALTER TYPE "PlatformRole" ADD VALUE IF NOT EXISTS 'BUSINESS';

CREATE TYPE "OrderApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "BuyerSegment" AS ENUM ('B2C', 'B2B');
CREATE TYPE "ServiceApprovalStatus" AS ENUM ('PENDING_ADMIN', 'APPROVED', 'REJECTED');
CREATE TYPE "TechnicianResponse" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE "ContractorApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ContractorAvailability" AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');
CREATE TYPE "BannerAudience" AS ENUM ('B2C', 'B2B', 'BOTH');

CREATE TABLE "BusinessProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT,
    "gstin" TEXT,
    "billingAddress" TEXT NOT NULL,
    "shippingAddress" TEXT,
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessProfile_userId_key" ON "BusinessProfile"("userId");
CREATE UNIQUE INDEX "BusinessProfile_gstin_key" ON "BusinessProfile"("gstin");

ALTER TABLE "BusinessProfile"
  ADD CONSTRAINT "BusinessProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product"
  ADD COLUMN "b2cPriceInPaise" INTEGER,
  ADD COLUMN "b2bPriceInPaise" INTEGER,
  ADD COLUMN "minimumB2BQuantity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "allowB2BBackorder" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "specifications" JSONB;

UPDATE "Product" SET "b2cPriceInPaise" = "priceInPaise" WHERE "b2cPriceInPaise" IS NULL;
ALTER TABLE "Product" ALTER COLUMN "b2cPriceInPaise" SET NOT NULL;

ALTER TABLE "Banner"
  ADD COLUMN "audience" "BannerAudience" NOT NULL DEFAULT 'B2C';

ALTER TABLE "Order"
  ADD COLUMN "approvalStatus" "OrderApprovalStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "buyerSegment" "BuyerSegment" NOT NULL DEFAULT 'B2C',
  ADD COLUMN "approvedById" UUID,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "OrderItem"
  ADD COLUMN "buyerSegment" "BuyerSegment" NOT NULL DEFAULT 'B2C',
  ADD COLUMN "backorderedQuantity" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ContractorProfile"
  ADD COLUMN "serviceArea" TEXT,
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "experienceYears" INTEGER,
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "approvalStatus" "ContractorApprovalStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "availability" "ContractorAvailability" NOT NULL DEFAULT 'OFFLINE';

CREATE TABLE "ContractorService" (
    "id" UUID NOT NULL,
    "contractorId" UUID NOT NULL,
    "serviceType" TEXT NOT NULL,
    "description" TEXT,
    "visitChargeInPaise" INTEGER NOT NULL DEFAULT 0,
    "priceFromInPaise" INTEGER,
    "priceToInPaise" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ContractorService_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContractorService_serviceType_active_idx"
  ON "ContractorService"("serviceType", "active");

ALTER TABLE "ContractorService"
  ADD CONSTRAINT "ContractorService_contractorId_fkey"
  FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceBooking"
  ADD COLUMN "approvalStatus" "ServiceApprovalStatus" NOT NULL DEFAULT 'PENDING_ADMIN',
  ADD COLUMN "technicianResponse" "TechnicianResponse" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "customerLatitude" DOUBLE PRECISION,
  ADD COLUMN "customerLongitude" DOUBLE PRECISION,
  ADD COLUMN "requestedPriceInPaise" INTEGER,
  ADD COLUMN "finalPriceInPaise" INTEGER,
  ADD COLUMN "approvedById" UUID,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT;

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY';
CREATE TABLE "ServiceOffer" (
  "id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "discountInPaise" INTEGER NOT NULL CHECK ("discountInPaise" > 0),
  "serviceType" TEXT,
  "contractorId" UUID,
  "productId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceOffer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceOffer_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ServiceOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
ALTER TABLE "ServiceBooking" ADD COLUMN "notes" TEXT,
  ADD COLUMN "offerId" UUID,
  ADD COLUMN "offerTitle" TEXT,
  ADD COLUMN "discountInPaise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ServiceOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

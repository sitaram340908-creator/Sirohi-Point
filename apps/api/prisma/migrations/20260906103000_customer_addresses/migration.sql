CREATE TABLE "CustomerAddress" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "line1" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT,
  "postalCode" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CustomerAddress_userId_isDefault_idx" ON "CustomerAddress"("userId", "isDefault");
ALTER TABLE "ServiceBooking" ADD COLUMN "addressId" UUID;
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "CustomerAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

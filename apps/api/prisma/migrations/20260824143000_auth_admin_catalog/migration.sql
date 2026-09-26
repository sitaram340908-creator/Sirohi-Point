ALTER TABLE "User"
  ALTER COLUMN "phone" DROP NOT NULL,
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Product"
  ADD COLUMN "imageUrl" TEXT;

CREATE TABLE "Banner" (
  "id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "badge" TEXT,
  "imageUrl" TEXT,
  "productId" TEXT,
  "ctaLabel" TEXT,
  "backgroundColor" TEXT NOT NULL DEFAULT '#0B1F33',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Banner_active_sortOrder_idx" ON "Banner"("active", "sortOrder");

ALTER TABLE "Banner"
  ADD CONSTRAINT "Banner_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Product" ADD COLUMN "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 18;
UPDATE "Product" AS product
SET "gstRate" = hsn."igstRate"
FROM "HsnMaster" AS hsn
WHERE product."hsnId" = hsn."id";

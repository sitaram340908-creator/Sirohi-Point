-- Store immutable billing and shipping address snapshots for every order.
ALTER TABLE "Order" ADD COLUMN "billingAddress" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingAddress" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingSameAsBilling" BOOLEAN NOT NULL DEFAULT true;

-- Existing orders used a single delivery address; retain it as both addresses.
UPDATE "Order"
SET "billingAddress" = "deliveryAddress",
    "shippingAddress" = "deliveryAddress"
WHERE "billingAddress" IS NULL OR "shippingAddress" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "billingAddress" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "shippingAddress" SET NOT NULL;

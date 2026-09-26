-- Keep existing UUID order values readable, while allowing new customer-facing
-- order numbers to be 12-digit numeric strings.
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";
ALTER TABLE "ServiceBooking" DROP CONSTRAINT "ServiceBooking_orderId_fkey";

ALTER TABLE "OrderItem"
  ALTER COLUMN "orderId" TYPE TEXT USING "orderId"::text;
ALTER TABLE "ServiceBooking"
  ALTER COLUMN "orderId" TYPE TEXT USING "orderId"::text;
ALTER TABLE "Order"
  ALTER COLUMN "id" TYPE TEXT USING "id"::text;

CREATE TEMP TABLE "OrderIdMap" AS
SELECT "id" AS old_id,
       (100000000000 + ROW_NUMBER() OVER (ORDER BY "createdAt", "id"))::text AS new_id
FROM "Order";

UPDATE "OrderItem" AS item
SET "orderId" = map.new_id
FROM "OrderIdMap" AS map
WHERE item."orderId" = map.old_id;
UPDATE "ServiceBooking" AS booking
SET "orderId" = map.new_id
FROM "OrderIdMap" AS map
WHERE booking."orderId" = map.old_id;
UPDATE "Order" AS order_record
SET "id" = map.new_id
FROM "OrderIdMap" AS map
WHERE order_record."id" = map.old_id;
DROP TABLE "OrderIdMap";

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceBooking"
  ADD CONSTRAINT "ServiceBooking_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

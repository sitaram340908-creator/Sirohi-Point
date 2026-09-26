-- Return requests use a short customer-facing identifier, for example R123456789.
-- Preserve existing UUID-backed requests by assigning them stable R + 9 digit IDs.
ALTER TABLE "ReturnRequestItem" DROP CONSTRAINT "ReturnRequestItem_returnRequestId_fkey";

ALTER TABLE "ReturnRequest"
  ALTER COLUMN "id" TYPE TEXT USING "id"::text;
ALTER TABLE "ReturnRequestItem"
  ALTER COLUMN "returnRequestId" TYPE TEXT USING "returnRequestId"::text;

CREATE TEMP TABLE "ReturnRequestIdMap" AS
SELECT "id" AS old_id,
       ('R' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt", "id")::text, 9, '0')) AS new_id
FROM "ReturnRequest";

UPDATE "ReturnRequestItem" AS item
SET "returnRequestId" = map.new_id
FROM "ReturnRequestIdMap" AS map
WHERE item."returnRequestId" = map.old_id;

UPDATE "ReturnRequest" AS request_record
SET "id" = map.new_id
FROM "ReturnRequestIdMap" AS map
WHERE request_record."id" = map.old_id;

DROP TABLE "ReturnRequestIdMap";

ALTER TABLE "ReturnRequestItem"
  ADD CONSTRAINT "ReturnRequestItem_returnRequestId_fkey"
  FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

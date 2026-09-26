CREATE TABLE "ReturnRequestItem" (
    "id" UUID NOT NULL,
    "returnRequestId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ReturnRequestItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReturnRequestItem_returnRequestId_orderItemId_key" ON "ReturnRequestItem"("returnRequestId", "orderItemId");
CREATE INDEX "ReturnRequestItem_orderItemId_idx" ON "ReturnRequestItem"("orderItemId");

ALTER TABLE "ReturnRequestItem" ADD CONSTRAINT "ReturnRequestItem_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnRequestItem" ADD CONSTRAINT "ReturnRequestItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ReturnRequestItem" ("id", "returnRequestId", "orderItemId", "quantity")
SELECT gen_random_uuid(), "id", "orderItemId", "quantity"
FROM "ReturnRequest";

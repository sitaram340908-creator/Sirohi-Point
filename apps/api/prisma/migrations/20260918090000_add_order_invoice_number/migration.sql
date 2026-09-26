ALTER TABLE "Order" ADD COLUMN "invoiceNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN "showInvoiceNumber" BOOLEAN NOT NULL DEFAULT false;

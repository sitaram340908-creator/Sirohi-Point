CREATE TYPE "PaymentChannel" AS ENUM ('CARD', 'UPI', 'NETBANKING', 'WALLET', 'EMI', 'OTHER');

ALTER TABLE "Order"
  ADD COLUMN "paymentChannel" "PaymentChannel",
  ADD COLUMN "paymentProvider" TEXT,
  ADD COLUMN "razorpayPaymentId" TEXT;

CREATE UNIQUE INDEX "Order_razorpayPaymentId_key" ON "Order"("razorpayPaymentId");

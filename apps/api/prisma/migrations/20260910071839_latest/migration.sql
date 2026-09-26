-- DropForeignKey
ALTER TABLE "ServiceOffer" DROP CONSTRAINT "ServiceOffer_contractorId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceOffer" DROP CONSTRAINT "ServiceOffer_productId_fkey";

-- AddForeignKey
ALTER TABLE "ServiceOffer" ADD CONSTRAINT "ServiceOffer_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "ContractorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOffer" ADD CONSTRAINT "ServiceOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

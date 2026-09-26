-- A customer profile preference for technician ranking. This never filters
-- technicians, and existing customers may keep a null location.
ALTER TABLE "User" ADD COLUMN "customerLocation" TEXT;

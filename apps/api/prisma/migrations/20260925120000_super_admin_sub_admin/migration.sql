CREATE TYPE "PlatformRole_new" AS ENUM (
  'CUSTOMER', 'BUSINESS', 'VENDOR', 'CONTRACTOR', 'DISTRIBUTOR',
  'SUPER_ADMIN', 'SUB_ADMIN'
);

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "PlatformRole_new"
  USING (
    CASE
      WHEN "role"::text = 'ADMIN' AND "id" = '00000000-0000-4000-8000-000000000099' THEN 'SUPER_ADMIN'
      WHEN "role"::text = 'ADMIN' THEN 'SUB_ADMIN'
      ELSE "role"::text
    END
  )::"PlatformRole_new";

DROP TYPE "PlatformRole";
ALTER TYPE "PlatformRole_new" RENAME TO "PlatformRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
ALTER TABLE "User" ADD COLUMN "adminPermissions" JSONB;
UPDATE "User" SET "adminPermissions" = '[]'::jsonb WHERE "role" = 'SUB_ADMIN';

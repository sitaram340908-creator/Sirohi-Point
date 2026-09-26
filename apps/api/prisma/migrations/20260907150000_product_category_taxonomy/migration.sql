-- Replace Product.category text with a normalized category taxonomy while
-- preserving every existing product's legacy category assignment.

CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subcategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

-- The fixed taxonomy category IDs make the legacy Product.category backfill
-- deterministic and are also used by the seed's slug-based upserts.
INSERT INTO "Category" ("id", "name", "slug", "sortOrder") VALUES
    ('00000000-0000-4000-8000-000000001001', 'Hardware', 'hardware', 0),
    ('00000000-0000-4000-8000-000000001002', 'Electrical', 'electrical', 1),
    ('00000000-0000-4000-8000-000000001003', 'Electronics', 'electronics', 2),
    ('00000000-0000-4000-8000-000000001004', 'Paint', 'paint', 3),
    ('00000000-0000-4000-8000-000000001005', 'PVC PIPE', 'plumbing', 4),
    ('00000000-0000-4000-8000-000000001006', 'Sanitary', 'sanitary', 5),
    ('00000000-0000-4000-8000-000000001007', 'Others', 'others', 6);

ALTER TABLE "Product"
    ADD COLUMN "categoryId" UUID,
    ADD COLUMN "subcategoryId" UUID;

-- "PVC & Plumbing" is the legacy spelling used by the existing catalog.
-- Unknown legacy values are retained under the requested catch-all category.
UPDATE "Product"
SET "categoryId" = CASE lower(trim("category"))
    WHEN 'hardware' THEN '00000000-0000-4000-8000-000000001001'::uuid
    WHEN 'electrical' THEN '00000000-0000-4000-8000-000000001002'::uuid
    WHEN 'electronics' THEN '00000000-0000-4000-8000-000000001003'::uuid
    WHEN 'paint' THEN '00000000-0000-4000-8000-000000001004'::uuid
    WHEN 'plumbing' THEN '00000000-0000-4000-8000-000000001005'::uuid
    WHEN 'pvc & plumbing' THEN '00000000-0000-4000-8000-000000001005'::uuid
    WHEN 'sanitary' THEN '00000000-0000-4000-8000-000000001006'::uuid
    ELSE '00000000-0000-4000-8000-000000001007'::uuid
END;

ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;

DROP INDEX "Product_category_active_idx";
ALTER TABLE "Product" DROP COLUMN "category";

CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX "Subcategory_slug_key" ON "Subcategory"("slug");
CREATE UNIQUE INDEX "Subcategory_categoryId_name_key" ON "Subcategory"("categoryId", "name");
CREATE INDEX "Subcategory_categoryId_sortOrder_idx" ON "Subcategory"("categoryId", "sortOrder");
CREATE INDEX "Product_categoryId_active_idx" ON "Product"("categoryId", "active");
CREATE INDEX "Product_subcategoryId_active_idx" ON "Product"("subcategoryId", "active");

ALTER TABLE "Subcategory"
    ADD CONSTRAINT "Subcategory_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product"
    ADD CONSTRAINT "Product_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product"
    ADD CONSTRAINT "Product_subcategoryId_fkey"
    FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

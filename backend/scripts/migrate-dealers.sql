-- Step 1: Create suppliers table and add supplier_id to products
-- This is run BEFORE dropping dealer column

-- CreateTable suppliers
CREATE TABLE IF NOT EXISTS "suppliers" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_spent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_order" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "suppliers_shop_id_name_idx" ON "suppliers"("shop_id", "name");
CREATE INDEX IF NOT EXISTS "suppliers_shop_id_phone_idx" ON "suppliers"("shop_id", "phone");
CREATE INDEX IF NOT EXISTS "suppliers_shop_id_email_idx" ON "suppliers"("shop_id", "email");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT IF NOT EXISTS "suppliers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Products - Add supplier_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='supplier_id') THEN
        ALTER TABLE "products" ADD COLUMN "supplier_id" TEXT;
    END IF;
END $$;

-- AddForeignKey for products -> suppliers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_supplier_id_fkey') THEN
        ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Data migration: Create suppliers from dealer values
INSERT INTO suppliers (id, shop_id, name, notes, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  p.shop_id,
  p.dealer,
  'Migrated from dealer field',
  NOW(),
  NOW()
FROM products p
WHERE p.dealer IS NOT NULL AND p.dealer != ''
GROUP BY p.shop_id, p.dealer
ON CONFLICT DO NOTHING;

-- Update products to link to suppliers
UPDATE products p
SET supplier_id = s.id
FROM suppliers s
WHERE p.dealer = s.name 
  AND p.shop_id = s.shop_id 
  AND p.dealer IS NOT NULL
  AND s.notes = 'Migrated from dealer field';

-- Drop the dealer column
ALTER TABLE "products" DROP COLUMN IF EXISTS "dealer";

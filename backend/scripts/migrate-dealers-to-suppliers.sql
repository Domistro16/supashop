-- Migration: Convert dealer values to suppliers
-- Then drop the dealer column

BEGIN;

-- 1. Create suppliers from unique dealer values
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

-- 2. Update products to link to newly created suppliers
UPDATE products p
SET supplier_id = s.id
FROM suppliers s
WHERE p.dealer = s.name 
  AND p.shop_id = s.shop_id 
  AND p.dealer IS NOT NULL
  AND s.notes = 'Migrated from dealer field';

-- 3. Drop the dealer column
ALTER TABLE products DROP COLUMN IF EXISTS dealer;

COMMIT;

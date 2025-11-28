-- Check if dealer column exists and drop it if it does
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'dealer'
    ) THEN
        -- Add supplier_id column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'products'
            AND column_name = 'supplier_id'
        ) THEN
            ALTER TABLE products ADD COLUMN supplier_id TEXT;
            ALTER TABLE products ADD CONSTRAINT products_supplier_id_fkey 
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        -- Migrate data from dealer to suppliers
        INSERT INTO suppliers (id, shop_id, name, notes, created_at, updated_at)
        SELECT 
            gen_random_uuid(),
            p.shop_id,
            p.dealer,
            'Migrated from dealer field',
            NOW(),
            NOW()
        FROM products p
        WHERE p.dealer IS NOT NULL 
            AND p.dealer != ''
            AND NOT EXISTS (
                SELECT 1 FROM suppliers s 
                WHERE s.name = p.dealer 
                    AND s.shop_id = p.shop_id
            )
        GROUP BY p.shop_id, p.dealer;

        -- Link products to suppliers
        UPDATE products p
        SET supplier_id = s.id
        FROM suppliers s
        WHERE p.dealer = s.name 
            AND p.shop_id = s.shop_id 
            AND p.dealer IS NOT NULL
            AND p.supplier_id IS NULL;

        -- Drop dealer column
        ALTER TABLE products DROP COLUMN dealer;
        
        RAISE NOTICE 'Migration completed successfully';
    ELSE
        RAISE NOTICE 'Dealer column does not exist - migration already completed';
    END IF;
END $$;

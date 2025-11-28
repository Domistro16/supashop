import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function completeMigration() {
  try {
    console.log('Checking if dealer column exists...');
    
    // Check if dealer column exists
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name = 'dealer'
    `;

    if (result.length === 0) {
      console.log('✓ Dealer column does not exist - migration already completed');
      return;
    }

    console.log('Dealer column found - completing migration...');

    // Add supplier_id column if it doesn't exist
    await prisma.$executeRaw`
      DO $$
      BEGIN
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
      END $$;
    `;

    // Migrate data from dealer to suppliers
    await prisma.$executeRaw`
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
      GROUP BY p.shop_id, p.dealer
    `;

    // Link products to suppliers
    await prisma.$executeRaw`
      UPDATE products p
      SET supplier_id = s.id
      FROM suppliers s
      WHERE p.dealer = s.name 
        AND p.shop_id = s.shop_id 
        AND p.dealer IS NOT NULL
        AND p.supplier_id IS NULL
    `;

    // Drop dealer column
    await prisma.$executeRaw`
      ALTER TABLE products DROP COLUMN dealer
    `;

    console.log('✓ Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

completeMigration();

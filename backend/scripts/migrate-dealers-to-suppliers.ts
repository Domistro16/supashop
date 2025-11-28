import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migration script to convert dealer values to supplier records
 * 
 * This script:
 * 1. Fetches all products with dealer values
 * 2. Groups products by unique dealer names
 * 3. Creates Supplier records for each unique dealer
 * 4. Links products to their corresponding suppliers
 * 5. Clears the dealer field after migration
 */
async function migrateDealersToSuppliers() {
  console.log('🚀 Starting dealer to supplier migration...\n');

  try {
    // Step 1: Fetch all products with dealer values
    const productsWithDealers = await prisma.product.findMany({
      where: {
        dealer: {
          not: null
        }
      },
      select: {
        id: true,
        dealer: true,
        shopId: true,
      }
    });

    console.log(`📊 Found ${productsWithDealers.length} products with dealer values`);

    if (productsWithDealers.length === 0) {
      console.log('✅ No dealers to migrate. Exiting.');
      return;
    }

    // Step 2: Group products by unique dealer names per shop
    const dealersByShop: Map<string, Map<string, string[]>> = new Map();
    
    for (const product of productsWithDealers) {
      if (!product.dealer) continue;
      
      if (!dealersByShop.has(product.shopId)) {
        dealersByShop.set(product.shopId, new Map());
      }
      
      const shopDealers = dealersByShop.get(product.shopId)!;
      if (!shopDealers.has(product.dealer)) {
        shopDealers.set(product.dealer, []);
      }
      
      shopDealers.get(product.dealer)!.push(product.id);
    }

    let totalDealers = 0;
    dealersByShop.forEach(shopDealers => {
      totalDealers += shopDealers.size;
    });

    console.log(`🏪 Found ${totalDealers} unique dealer(s) across ${dealersByShop.size} shop(s)\n`);

    // Step 3 & 4: Create suppliers and link products
    let created = 0;
    let linked = 0;

    for (const [shopId, dealers] of dealersByShop.entries()) {
      console.log(`\nProcessing shop: ${shopId}`);
      
      for (const [dealerName, productIds] of dealers.entries()) {
        console.log(`  - Creating supplier: "${dealerName}"`);
        
        // Create supplier
        const supplier = await prisma.supplier.create({
          data: {
            shopId,
            name: dealerName,
            notes: 'Migrated from dealer field',
          }
        });
        
        created++;
        console.log(`    ✓ Created supplier (ID: ${supplier.id})`);

        // Link products to this supplier
        const updateResult = await prisma.product.updateMany({
          where: {
            id: { in: productIds }
          },
          data: {
            supplierId: supplier.id,
          }
        });

        linked += updateResult.count;
        console.log(`    ✓ Linked ${updateResult.count} product(s) to this supplier`);
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   - Suppliers created: ${created}`);
    console.log(`   - Products linked: ${linked}`);

    // Step 5: Clear dealer field values
    console.log(`\n🧹 Clearing dealer field values...`);
    const clearResult = await prisma.product.updateMany({
      where: {
        dealer: { not: null }
      },
      data: {
        dealer: null
      }
    });

    console.log(`   ✓ Cleared dealer field from ${clearResult.count} product(s)`);

    // Verification
    console.log(`\n✅ Verification:`);
    const remainingDealers = await prisma.product.count({
      where: {
        dealer: { not: null }
      }
    });

    const productsWithSuppliers = await prisma.product.count({
      where: {
        supplierId: { not: null }
      }
    });

    console.log(`   - Products with dealer values: ${remainingDealers}`);
    console.log(`   - Products with suppliers: ${productsWithSuppliers}`);

    if (remainingDealers === 0) {
      console.log(`\n🎉 Migration completed successfully!`);
    } else {
      console.log(`\n⚠️  Warning: ${remainingDealers} products still have dealer values`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateDealersToSuppliers()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

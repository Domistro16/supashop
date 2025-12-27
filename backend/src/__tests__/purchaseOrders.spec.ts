/**
 * Purchase Orders Tests
 * 
 * Tests the PO create -> receive flow and verifies inventory updates.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test helpers
async function createTestShop(ownerId: string) {
    return prisma.shop.create({
        data: {
            name: 'Test Shop',
            ownerId,
        },
    });
}

async function createTestUser() {
    const email = `test-${Date.now()}@example.com`;
    return prisma.user.create({
        data: {
            email,
            passwordHash: 'test-hash',
            name: 'Test User',
        },
    });
}

async function createTestSupplier(shopId: string) {
    return prisma.supplier.create({
        data: {
            shopId,
            name: 'Test Supplier',
            email: 'supplier@test.com',
        },
    });
}

async function createTestProduct(shopId: string, supplierId: string, initialStock: number = 0) {
    return prisma.product.create({
        data: {
            shopId,
            supplierId,
            name: `Test Product ${Date.now()}`,
            stock: initialStock,
            price: 10.00,
        },
    });
}

// Cleanup helper
async function cleanup(ids: {
    userId?: string;
    shopId?: string;
    supplierId?: string;
    productIds?: string[];
    poId?: string;
}) {
    if (ids.poId) {
        await prisma.purchaseOrder.deleteMany({ where: { id: ids.poId } });
    }
    if (ids.productIds?.length) {
        await prisma.product.deleteMany({ where: { id: { in: ids.productIds } } });
    }
    if (ids.supplierId) {
        await prisma.supplier.deleteMany({ where: { id: ids.supplierId } });
    }
    if (ids.shopId) {
        await prisma.shop.deleteMany({ where: { id: ids.shopId } });
    }
    if (ids.userId) {
        await prisma.user.deleteMany({ where: { id: ids.userId } });
    }
}

describe('PurchaseOrder', () => {
    describe('Inventory Update on Receive', () => {
        it('should increase product stock when PO is received', async () => {
            // Setup
            const user = await createTestUser();
            const shop = await createTestShop(user.id);
            const supplier = await createTestSupplier(shop.id);
            const product = await createTestProduct(shop.id, supplier.id, 10); // Initial stock: 10

            const initialStock = product.stock;
            const orderQuantity = 25;

            try {
                // Create PO
                const po = await prisma.purchaseOrder.create({
                    data: {
                        poNumber: `TEST-PO-${Date.now()}`,
                        shopId: shop.id,
                        supplierId: supplier.id,
                        status: 'sent', // Already sent so we can receive
                        totalAmount: orderQuantity * 10,
                    },
                });

                // Create PO item
                const poItem = await prisma.purchaseOrderItem.create({
                    data: {
                        purchaseOrderId: po.id,
                        productId: product.id,
                        quantityOrdered: orderQuantity,
                        unitCost: 10,
                    },
                });

                // Simulate receive: increment stock and update item
                await prisma.$transaction([
                    prisma.product.update({
                        where: { id: product.id },
                        data: { stock: { increment: orderQuantity } },
                    }),
                    prisma.purchaseOrderItem.update({
                        where: { id: poItem.id },
                        data: { quantityReceived: orderQuantity },
                    }),
                    prisma.purchaseOrder.update({
                        where: { id: po.id },
                        data: { status: 'received', receivedAt: new Date() },
                    }),
                ]);

                // Verify stock increased
                const updatedProduct = await prisma.product.findUnique({
                    where: { id: product.id },
                });

                expect(updatedProduct?.stock).toBe(initialStock + orderQuantity);
                expect(updatedProduct?.stock).toBe(35); // 10 + 25

                // Cleanup
                await cleanup({
                    poId: po.id,
                    productIds: [product.id],
                    supplierId: supplier.id,
                    shopId: shop.id,
                    userId: user.id,
                });
            } catch (error) {
                // Cleanup on error
                await cleanup({
                    productIds: [product.id],
                    supplierId: supplier.id,
                    shopId: shop.id,
                    userId: user.id,
                });
                throw error;
            }
        });

        it('should handle partial receives correctly', async () => {
            // Setup
            const user = await createTestUser();
            const shop = await createTestShop(user.id);
            const supplier = await createTestSupplier(shop.id);
            const product = await createTestProduct(shop.id, supplier.id, 5); // Initial stock: 5

            const orderQuantity = 20;
            const firstReceive = 8;
            const secondReceive = 12;

            try {
                // Create PO
                const po = await prisma.purchaseOrder.create({
                    data: {
                        poNumber: `TEST-PO-PARTIAL-${Date.now()}`,
                        shopId: shop.id,
                        supplierId: supplier.id,
                        status: 'sent',
                        totalAmount: orderQuantity * 10,
                    },
                });

                // Create PO item
                const poItem = await prisma.purchaseOrderItem.create({
                    data: {
                        purchaseOrderId: po.id,
                        productId: product.id,
                        quantityOrdered: orderQuantity,
                        unitCost: 10,
                    },
                });

                // First partial receive
                await prisma.$transaction([
                    prisma.product.update({
                        where: { id: product.id },
                        data: { stock: { increment: firstReceive } },
                    }),
                    prisma.purchaseOrderItem.update({
                        where: { id: poItem.id },
                        data: { quantityReceived: firstReceive },
                    }),
                    prisma.purchaseOrder.update({
                        where: { id: po.id },
                        data: { status: 'partial' },
                    }),
                ]);

                // Verify first receive
                let updatedProduct = await prisma.product.findUnique({
                    where: { id: product.id },
                });
                expect(updatedProduct?.stock).toBe(5 + firstReceive); // 13

                // Second receive (completes the order)
                await prisma.$transaction([
                    prisma.product.update({
                        where: { id: product.id },
                        data: { stock: { increment: secondReceive } },
                    }),
                    prisma.purchaseOrderItem.update({
                        where: { id: poItem.id },
                        data: { quantityReceived: { increment: secondReceive } },
                    }),
                    prisma.purchaseOrder.update({
                        where: { id: po.id },
                        data: { status: 'received', receivedAt: new Date() },
                    }),
                ]);

                // Verify final stock
                updatedProduct = await prisma.product.findUnique({
                    where: { id: product.id },
                });
                expect(updatedProduct?.stock).toBe(5 + firstReceive + secondReceive); // 25

                // Verify PO item
                const updatedItem = await prisma.purchaseOrderItem.findUnique({
                    where: { id: poItem.id },
                });
                expect(updatedItem?.quantityReceived).toBe(orderQuantity);

                // Cleanup
                await cleanup({
                    poId: po.id,
                    productIds: [product.id],
                    supplierId: supplier.id,
                    shopId: shop.id,
                    userId: user.id,
                });
            } catch (error) {
                await cleanup({
                    productIds: [product.id],
                    supplierId: supplier.id,
                    shopId: shop.id,
                    userId: user.id,
                });
                throw error;
            }
        });

        it('should handle multiple products in one PO', async () => {
            // Setup
            const user = await createTestUser();
            const shop = await createTestShop(user.id);
            const supplier = await createTestSupplier(shop.id);
            const product1 = await createTestProduct(shop.id, supplier.id, 0);
            const product2 = await createTestProduct(shop.id, supplier.id, 10);

            try {
                // Create PO
                const po = await prisma.purchaseOrder.create({
                    data: {
                        poNumber: `TEST-PO-MULTI-${Date.now()}`,
                        shopId: shop.id,
                        supplierId: supplier.id,
                        status: 'sent',
                        totalAmount: 500,
                    },
                });

                // Create PO items
                await prisma.purchaseOrderItem.createMany({
                    data: [
                        {
                            purchaseOrderId: po.id,
                            productId: product1.id,
                            quantityOrdered: 30,
                            unitCost: 10,
                        },
                        {
                            purchaseOrderId: po.id,
                            productId: product2.id,
                            quantityOrdered: 20,
                            unitCost: 10,
                        },
                    ],
                });

                // Receive all items
                await prisma.$transaction([
                    prisma.product.update({
                        where: { id: product1.id },
                        data: { stock: { increment: 30 } },
                    }),
                    prisma.product.update({
                        where: { id: product2.id },
                        data: { stock: { increment: 20 } },
                    }),
                    prisma.purchaseOrder.update({
                        where: { id: po.id },
                        data: { status: 'received', receivedAt: new Date() },
                    }),
                ]);

                // Verify stocks
                const updated1 = await prisma.product.findUnique({ where: { id: product1.id } });
                const updated2 = await prisma.product.findUnique({ where: { id: product2.id } });

                expect(updated1?.stock).toBe(30); // 0 + 30
                expect(updated2?.stock).toBe(30); // 10 + 20

                // Cleanup
                await cleanup({
                    poId: po.id,
                    productIds: [product1.id, product2.id],
                    supplierId: supplier.id,
                    shopId: shop.id,
                    userId: user.id,
                });
            } catch (error) {
                await cleanup({
                    productIds: [product1.id, product2.id],
                    supplierId: supplier.id,
                    shopId: shop.id,
                    userId: user.id,
                });
                throw error;
            }
        });
    });
});

// Allow running with ts-node or jest
if (require.main === module) {
    console.log('Run with: npx jest src/__tests__/purchaseOrders.test.ts');
}

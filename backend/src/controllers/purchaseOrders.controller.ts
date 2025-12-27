import { Response } from 'express';
import { AuthRequest } from '../types';
import { PrismaClient } from '@prisma/client';
import { sendPurchaseOrderToSupplier } from '../services/supplierNotification.service';

const prisma = new PrismaClient();

// Valid PO statuses
const PO_STATUSES = ['draft', 'sent', 'partial', 'received', 'cancelled'] as const;
type POStatus = typeof PO_STATUSES[number];

/**
 * Generate a unique PO number
 */
function generatePONumber(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    return `PO-${timestamp}-${random}`.toUpperCase();
}

/**
 * Get all purchase orders for the current shop
 */
export async function getPurchaseOrders(req: AuthRequest, res: Response) {
    try {
        if (!req.shopId) {
            return res.status(400).json({ error: 'Shop context required' });
        }

        const { status, supplierId } = req.query;

        const where: any = { shopId: req.shopId };
        if (status) where.status = status;
        if (supplierId) where.supplierId = supplierId;

        const purchaseOrders = await prisma.purchaseOrder.findMany({
            where,
            include: {
                supplier: {
                    select: { id: true, name: true, email: true },
                },
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ purchaseOrders });
    } catch (error) {
        console.error('Get purchase orders error:', error);
        res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
}

/**
 * Get a single purchase order by ID
 */
export async function getPurchaseOrder(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;

        if (!req.shopId) {
            return res.status(400).json({ error: 'Shop context required' });
        }

        const purchaseOrder = await prisma.purchaseOrder.findFirst({
            where: { id, shopId: req.shopId },
            include: {
                supplier: true,
                shop: {
                    select: { name: true, address: true },
                },
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, stock: true, price: true },
                        },
                    },
                },
            },
        });

        if (!purchaseOrder) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        res.json({ purchaseOrder });
    } catch (error) {
        console.error('Get purchase order error:', error);
        res.status(500).json({ error: 'Failed to fetch purchase order' });
    }
}

/**
 * Create a new purchase order
 */
export async function createPurchaseOrder(req: AuthRequest, res: Response) {
    try {
        const { supplierId, items, notes } = req.body;

        if (!req.shopId || !req.user) {
            return res.status(400).json({ error: 'Shop context and authentication required' });
        }

        if (!supplierId) {
            return res.status(400).json({ error: 'Supplier ID is required' });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'At least one item is required' });
        }

        // Validate supplier exists and belongs to shop
        const supplier = await prisma.supplier.findFirst({
            where: { id: supplierId, shopId: req.shopId },
        });

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        // Validate products exist and belong to shop
        let totalAmount = 0;
        const validatedItems: Array<{ productId: string; quantityOrdered: number; unitCost: number }> = [];

        for (const item of items) {
            if (!item.productId || !item.quantityOrdered || item.quantityOrdered <= 0) {
                return res.status(400).json({ error: 'Each item must have productId and positive quantityOrdered' });
            }

            const product = await prisma.product.findFirst({
                where: { id: item.productId, shopId: req.shopId },
            });

            if (!product) {
                return res.status(404).json({ error: `Product ${item.productId} not found` });
            }

            const unitCost = item.unitCost || Number(product.price);
            totalAmount += unitCost * item.quantityOrdered;

            validatedItems.push({
                productId: item.productId,
                quantityOrdered: item.quantityOrdered,
                unitCost,
            });
        }

        // Create PO with items in transaction
        const purchaseOrder = await prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.create({
                data: {
                    poNumber: generatePONumber(),
                    shopId: req.shopId!,
                    supplierId,
                    totalAmount,
                    notes: notes || null,
                    status: 'draft',
                },
            });

            for (const item of validatedItems) {
                await tx.purchaseOrderItem.create({
                    data: {
                        purchaseOrderId: po.id,
                        productId: item.productId,
                        quantityOrdered: item.quantityOrdered,
                        unitCost: item.unitCost,
                    },
                });
            }

            return po;
        });

        // Fetch complete PO with relations
        const completePO = await prisma.purchaseOrder.findUnique({
            where: { id: purchaseOrder.id },
            include: {
                supplier: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true } },
                    },
                },
            },
        });

        res.status(201).json({ purchaseOrder: completePO });
    } catch (error) {
        console.error('Create purchase order error:', error);
        res.status(500).json({ error: 'Failed to create purchase order' });
    }
}

/**
 * Update a purchase order (draft only)
 */
export async function updatePurchaseOrder(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const { notes, items } = req.body;

        if (!req.shopId) {
            return res.status(400).json({ error: 'Shop context required' });
        }

        const existingPO = await prisma.purchaseOrder.findFirst({
            where: { id, shopId: req.shopId },
        });

        if (!existingPO) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        if (existingPO.status !== 'draft') {
            return res.status(400).json({ error: 'Can only update draft purchase orders' });
        }

        // Update items if provided
        if (items && Array.isArray(items)) {
            let newTotal = 0;

            await prisma.$transaction(async (tx) => {
                // Delete existing items
                await tx.purchaseOrderItem.deleteMany({
                    where: { purchaseOrderId: id },
                });

                // Create new items
                for (const item of items) {
                    if (!item.productId || !item.quantityOrdered || item.quantityOrdered <= 0) {
                        throw new Error('Each item must have productId and positive quantityOrdered');
                    }

                    const product = await tx.product.findFirst({
                        where: { id: item.productId, shopId: req.shopId },
                    });

                    if (!product) {
                        throw new Error(`Product ${item.productId} not found`);
                    }

                    const unitCost = item.unitCost || Number(product.price);
                    newTotal += unitCost * item.quantityOrdered;

                    await tx.purchaseOrderItem.create({
                        data: {
                            purchaseOrderId: id,
                            productId: item.productId,
                            quantityOrdered: item.quantityOrdered,
                            unitCost,
                        },
                    });
                }

                await tx.purchaseOrder.update({
                    where: { id },
                    data: {
                        totalAmount: newTotal,
                        notes: notes !== undefined ? notes : existingPO.notes,
                    },
                });
            });
        } else if (notes !== undefined) {
            await prisma.purchaseOrder.update({
                where: { id },
                data: { notes },
            });
        }

        const updatedPO = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                supplier: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true } },
                    },
                },
            },
        });

        res.json({ purchaseOrder: updatedPO });
    } catch (error: any) {
        console.error('Update purchase order error:', error);
        res.status(500).json({ error: error.message || 'Failed to update purchase order' });
    }
}

/**
 * Send purchase order to supplier
 */
export async function sendPurchaseOrder(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;

        if (!req.shopId) {
            return res.status(400).json({ error: 'Shop context required' });
        }

        const purchaseOrder = await prisma.purchaseOrder.findFirst({
            where: { id, shopId: req.shopId },
            include: {
                supplier: true,
                shop: { select: { name: true, address: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true } },
                    },
                },
            },
        });

        if (!purchaseOrder) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        if (purchaseOrder.status !== 'draft') {
            return res.status(400).json({ error: 'Can only send draft purchase orders' });
        }

        // Send to supplier (stub)
        const sendResult = await sendPurchaseOrderToSupplier(purchaseOrder);

        // Update status
        const updatedPO = await prisma.purchaseOrder.update({
            where: { id },
            data: {
                status: 'sent',
                sentAt: new Date(),
            },
            include: {
                supplier: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true } },
                    },
                },
            },
        });

        // Update supplier stats
        await prisma.supplier.update({
            where: { id: purchaseOrder.supplierId },
            data: {
                totalOrders: { increment: 1 },
                lastOrder: new Date(),
            },
        });

        res.json({
            purchaseOrder: updatedPO,
            notification: sendResult,
        });
    } catch (error) {
        console.error('Send purchase order error:', error);
        res.status(500).json({ error: 'Failed to send purchase order' });
    }
}

/**
 * Receive shipment for purchase order
 * Updates inventory for received items
 */
export async function receivePurchaseOrder(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;
        const { items } = req.body;

        if (!req.shopId) {
            return res.status(400).json({ error: 'Shop context required' });
        }

        const purchaseOrder = await prisma.purchaseOrder.findFirst({
            where: { id, shopId: req.shopId },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, name: true, stock: true } },
                    },
                },
            },
        });

        if (!purchaseOrder) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        if (!['sent', 'partial'].includes(purchaseOrder.status)) {
            return res.status(400).json({ error: 'Can only receive sent or partial purchase orders' });
        }

        // Process received items
        const receivedItems: Array<{ itemId: string; quantityReceived: number }> = [];

        if (items && Array.isArray(items)) {
            // Partial receive - specific items
            for (const item of items) {
                if (!item.itemId || !item.quantityReceived || item.quantityReceived <= 0) {
                    return res.status(400).json({ error: 'Each item must have itemId and positive quantityReceived' });
                }

                const poItem = purchaseOrder.items.find(i => i.id === item.itemId);
                if (!poItem) {
                    return res.status(404).json({ error: `Item ${item.itemId} not found in this PO` });
                }

                const remaining = poItem.quantityOrdered - poItem.quantityReceived;
                if (item.quantityReceived > remaining) {
                    return res.status(400).json({
                        error: `Cannot receive more than ordered. Item ${poItem.product.name}: ordered ${poItem.quantityOrdered}, already received ${poItem.quantityReceived}, remaining ${remaining}`,
                    });
                }

                receivedItems.push({
                    itemId: item.itemId,
                    quantityReceived: item.quantityReceived,
                });
            }
        } else {
            // Full receive - all remaining items
            for (const poItem of purchaseOrder.items) {
                const remaining = poItem.quantityOrdered - poItem.quantityReceived;
                if (remaining > 0) {
                    receivedItems.push({
                        itemId: poItem.id,
                        quantityReceived: remaining,
                    });
                }
            }
        }

        if (receivedItems.length === 0) {
            return res.status(400).json({ error: 'No items to receive' });
        }

        // Update inventory and PO items in transaction
        await prisma.$transaction(async (tx) => {
            for (const item of receivedItems) {
                const poItem = purchaseOrder.items.find(i => i.id === item.itemId)!;

                // Update product stock (INCREASE inventory)
                await tx.product.update({
                    where: { id: poItem.productId },
                    data: {
                        stock: { increment: item.quantityReceived },
                    },
                });

                // Update PO item received quantity
                await tx.purchaseOrderItem.update({
                    where: { id: item.itemId },
                    data: {
                        quantityReceived: { increment: item.quantityReceived },
                    },
                });
            }
        });

        // Check if fully received
        const updatedPO = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                items: true,
            },
        });

        const isFullyReceived = updatedPO!.items.every(
            item => item.quantityReceived >= item.quantityOrdered
        );

        // Update PO status
        const finalPO = await prisma.purchaseOrder.update({
            where: { id },
            data: {
                status: isFullyReceived ? 'received' : 'partial',
                receivedAt: isFullyReceived ? new Date() : null,
            },
            include: {
                supplier: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, stock: true } },
                    },
                },
            },
        });

        // Update supplier total spent
        const totalReceived = receivedItems.reduce((sum, item) => {
            const poItem = purchaseOrder.items.find(i => i.id === item.itemId)!;
            return sum + (item.quantityReceived * Number(poItem.unitCost));
        }, 0);

        await prisma.supplier.update({
            where: { id: purchaseOrder.supplierId },
            data: {
                totalSpent: { increment: totalReceived },
            },
        });

        res.json({
            purchaseOrder: finalPO,
            received: receivedItems,
            isFullyReceived,
        });
    } catch (error) {
        console.error('Receive purchase order error:', error);
        res.status(500).json({ error: 'Failed to receive purchase order' });
    }
}

/**
 * Cancel a purchase order
 */
export async function cancelPurchaseOrder(req: AuthRequest, res: Response) {
    try {
        const { id } = req.params;

        if (!req.shopId) {
            return res.status(400).json({ error: 'Shop context required' });
        }

        const purchaseOrder = await prisma.purchaseOrder.findFirst({
            where: { id, shopId: req.shopId },
        });

        if (!purchaseOrder) {
            return res.status(404).json({ error: 'Purchase order not found' });
        }

        if (!['draft', 'sent'].includes(purchaseOrder.status)) {
            return res.status(400).json({ error: 'Can only cancel draft or sent purchase orders' });
        }

        const updatedPO = await prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'cancelled' },
            include: {
                supplier: { select: { id: true, name: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true } },
                    },
                },
            },
        });

        res.json({ purchaseOrder: updatedPO });
    } catch (error) {
        console.error('Cancel purchase order error:', error);
        res.status(500).json({ error: 'Failed to cancel purchase order' });
    }
}

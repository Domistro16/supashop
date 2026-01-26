import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '@server/prisma';
import { updateCustomerFromSale } from './customers.controller';
import { createNotification } from './notifications.controller';



/**
 * Offline Sale Payload Format
 */
interface OfflineSaleItem {
    productId: string;
    quantity: number;
    price: number;
    discountPercent?: number;
}

interface OfflineSale {
    clientTempId: string;
    items: OfflineSaleItem[];
    totalAmount: number;
    customerId?: string;
    createdAt?: string; // Original offline creation time
}

interface SyncRequest {
    sales: OfflineSale[];
}

interface SyncedSale {
    clientTempId: string;
    serverId: string;
    orderId: string;
    status: 'created' | 'existing';
}

interface SyncError {
    clientTempId: string;
    error: string;
}

interface SyncResponse {
    synced: SyncedSale[];
    errors: SyncError[];
}

/**
 * Generate a unique order ID
 */
function generateOrderId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `ORD-${timestamp}-${random}`.toUpperCase();
}

/**
 * Sync offline sales
 * 
 * Accepts an array of offline sales, deduplicates by clientTempId,
 * creates server records, and returns mapping of clientTempId -> serverId.
 * 
 * Conflict Policy:
 * - Inventory (server wins): Sales are always accepted, even if stock goes negative
 * - Sales (always accepted): All sales from offline sync are accepted to prevent data loss
 * - Idempotency: Same clientTempId returns existing mapping without creating duplicate
 */
export async function syncOfflineSales(req: AuthRequest, res: Response) {
    try {
        const { sales }: SyncRequest = req.body;

        if (!req.shopId || !req.user) {
            return res.status(400).json({ error: 'Shop context and authentication required' });
        }

        if (!sales || !Array.isArray(sales) || sales.length === 0) {
            return res.status(400).json({ error: 'At least one sale is required' });
        }

        const response: SyncResponse = {
            synced: [],
            errors: [],
        };

        // Process each offline sale
        for (const offlineSale of sales) {
            try {
                // Validate clientTempId
                if (!offlineSale.clientTempId) {
                    response.errors.push({
                        clientTempId: offlineSale.clientTempId || 'unknown',
                        error: 'clientTempId is required',
                    });
                    continue;
                }

                // Check if this clientTempId already exists (idempotency check)
                const existingSync = await prisma.offlineSaleSync.findUnique({
                    where: {
                        shopId_clientTempId: {
                            shopId: req.shopId,
                            clientTempId: offlineSale.clientTempId,
                        },
                    },
                    include: {
                        sale: {
                            select: {
                                id: true,
                                orderId: true,
                            },
                        },
                    },
                });

                if (existingSync) {
                    // Already synced - return existing mapping (idempotent)
                    response.synced.push({
                        clientTempId: offlineSale.clientTempId,
                        serverId: existingSync.saleId,
                        orderId: existingSync.sale.orderId,
                        status: 'existing',
                    });
                    continue;
                }

                // Validate items
                if (!offlineSale.items || offlineSale.items.length === 0) {
                    response.errors.push({
                        clientTempId: offlineSale.clientTempId,
                        error: 'At least one item is required',
                    });
                    continue;
                }

                // Validate products exist (but don't reject if stock is insufficient)
                let validItems = true;
                for (const item of offlineSale.items) {
                    const product = await prisma.product.findFirst({
                        where: {
                            id: item.productId,
                            shopId: req.shopId,
                        },
                    });

                    if (!product) {
                        response.errors.push({
                            clientTempId: offlineSale.clientTempId,
                            error: `Product ${item.productId} not found`,
                        });
                        validItems = false;
                        break;
                    }
                }

                if (!validItems) {
                    continue;
                }

                // Validate customer if provided (but don't reject sale if invalid)
                let customerId: string | null = null;
                if (offlineSale.customerId) {
                    const customer = await prisma.customer.findFirst({
                        where: {
                            id: offlineSale.customerId,
                            shopId: req.shopId,
                        },
                    });
                    if (customer) {
                        customerId = customer.id;
                    }
                    // If customer not found, we still accept the sale without customer
                }

                // Create sale and sync record in a transaction
                const result = await prisma.$transaction(async (tx) => {
                    // Create sale
                    const newSale = await tx.sale.create({
                        data: {
                            orderId: generateOrderId(),
                            shopId: req.shopId!,
                            staffId: req.user!.id,
                            customerId: customerId,
                            totalAmount: offlineSale.totalAmount,
                        },
                    });

                    // Create sale items and update product stock
                    // Note: Stock may go negative (server wins for inventory, sales always accepted)
                    for (const item of offlineSale.items) {
                        await tx.saleItem.create({
                            data: {
                                saleId: newSale.id,
                                productId: item.productId,
                                quantity: item.quantity,
                                price: item.price,
                                discountPercent: item.discountPercent || 0,
                            },
                        });

                        // Decrease product stock (may go negative for offline sales)
                        await tx.product.update({
                            where: { id: item.productId },
                            data: {
                                stock: {
                                    decrement: item.quantity,
                                },
                            },
                        });
                    }

                    // Create sync record for idempotency
                    await tx.offlineSaleSync.create({
                        data: {
                            shopId: req.shopId!,
                            clientTempId: offlineSale.clientTempId,
                            saleId: newSale.id,
                        },
                    });

                    // Log activity
                    await tx.activityLog.create({
                        data: {
                            shopId: req.shopId!,
                            staffId: req.user!.id,
                            action: 'sync_offline_sale',
                            details: {
                                saleId: newSale.id,
                                orderId: newSale.orderId,
                                clientTempId: offlineSale.clientTempId,
                                totalAmount: offlineSale.totalAmount.toString(),
                                itemCount: offlineSale.items.length,
                            },
                        },
                    });

                    return newSale;
                });

                // Update customer stats if customer was provided
                if (customerId) {
                    try {
                        await updateCustomerFromSale(customerId, Number(offlineSale.totalAmount));
                    } catch (error) {
                        console.error('Failed to update customer stats:', error);
                        // Don't fail the sync if customer update fails
                    }
                }

                // Create notification for synced sale
                if (req.user) {
                    await createNotification(
                        req.shopId,
                        req.user.id,
                        'sale',
                        'Offline Sale Synced',
                        `Offline sale synced: #${result.orderId} for ${offlineSale.totalAmount.toLocaleString()} with ${offlineSale.items.length} item(s).`,
                        {
                            saleId: result.id,
                            orderId: result.orderId,
                            clientTempId: offlineSale.clientTempId,
                            totalAmount: offlineSale.totalAmount,
                            itemCount: offlineSale.items.length,
                        }
                    );

                    // Check for low stock after sale
                    for (const item of offlineSale.items) {
                        const product = await prisma.product.findUnique({
                            where: { id: item.productId },
                        });

                        if (product && product.stock <= 10) {
                            await createNotification(
                                req.shopId,
                                req.user.id,
                                'low_stock',
                                'Low Stock Alert',
                                `Product "${product.name}" is running low after offline sync. Current: ${product.stock} units.`,
                                {
                                    productId: product.id,
                                    productName: product.name,
                                    stock: product.stock,
                                    saleId: result.id,
                                }
                            );
                        }
                    }
                }

                response.synced.push({
                    clientTempId: offlineSale.clientTempId,
                    serverId: result.id,
                    orderId: result.orderId,
                    status: 'created',
                });

            } catch (error: any) {
                console.error(`Error syncing offline sale ${offlineSale.clientTempId}:`, error);
                response.errors.push({
                    clientTempId: offlineSale.clientTempId,
                    error: error.message || 'Failed to sync sale',
                });
            }
        }

        res.json(response);
    } catch (error) {
        console.error('Sync offline sales error:', error);
        res.status(500).json({ error: 'Failed to sync offline sales' });
    }
}

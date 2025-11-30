import { Response } from 'express';
import { AuthRequest, CreateSaleRequest } from '../types';
import { PrismaClient } from '@prisma/client';
import { updateCustomerFromSale } from './customers.controller';
import { createNotification } from './notifications.controller';

const prisma = new PrismaClient();

/**
 * Generate a unique order ID
 */
function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

/**
 * Get all sales for the current shop
 */
export async function getSales(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const sales = await prisma.sale.findMany({
      where: { shopId: req.shopId },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(sales);
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
}

/**
 * Get a single sale by ID with items
 */
export async function getSale(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const sale = await prisma.sale.findFirst({
      where: {
        id,
        shopId: req.shopId,
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.json(sale);
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
}

/**
 * Get sale items for a specific sale
 */
export async function getSaleItems(req: AuthRequest, res: Response) {
  try {
    const { saleId } = req.params;

    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    // Verify sale belongs to shop
    const sale = await prisma.sale.findFirst({
      where: {
        id: saleId,
        shopId: req.shopId,
      },
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const saleItems = await prisma.saleItem.findMany({
      where: { saleId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(saleItems);
  } catch (error) {
    console.error('Get sale items error:', error);
    res.status(500).json({ error: 'Failed to fetch sale items' });
  }
}

/**
 * Create a new sale (record transaction)
 */
export async function createSale(req: AuthRequest, res: Response) {
  try {
    const { items, totalAmount, customerId }: CreateSaleRequest & { customerId?: string } = req.body;

    if (!req.shopId || !req.user) {
      return res.status(400).json({ error: 'Shop context and authentication required' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Validate customer if provided
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          shopId: req.shopId,
        },
      });

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
    }

    // Validate products exist and have sufficient stock
    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: {
          id: item.productId,
          shopId: req.shopId,
        },
      });

      if (!product) {
        return res.status(404).json({
          error: `Product ${item.productId} not found`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
        });
      }
    }

    // Create sale and update stock in a transaction
    const sale = await prisma.$transaction(async (tx) => {
      // Create sale
      const newSale = await tx.sale.create({
        data: {
          orderId: generateOrderId(),
          shopId: req.shopId!,
          staffId: req.user!.id,
          customerId: customerId || null,
          totalAmount,
        },
      });

      // Create sale items and update product stock
      for (const item of items) {
        await tx.saleItem.create({
          data: {
            saleId: newSale.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            discountPercent: item.discountPercent || 0,
          },
        });

        // Decrease product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          shopId: req.shopId!,
          staffId: req.user!.id,
          action: 'record_sale',
          details: {
            saleId: newSale.id,
            orderId: newSale.orderId,
            totalAmount: totalAmount.toString(),
            itemCount: items.length,
          },
        },
      });

      return newSale;
    });

    // Update customer stats if customer was provided
    if (customerId) {
      try {
        await updateCustomerFromSale(customerId, Number(totalAmount));
      } catch (error) {
        console.error('Failed to update customer stats:', error);
        // Don't fail the sale if customer update fails
      }
    }

    // Create notification for sale
    if (req.user) {
      await createNotification(
        req.shopId,
        req.user.id,
        'sale',
        'New Sale Recorded',
        `Sale #${sale.orderId} completed for ${totalAmount.toLocaleString()} with ${items.length} item(s).`,
        {
          saleId: sale.id,
          orderId: sale.orderId,
          totalAmount,
          itemCount: items.length,
        }
      );

      // Check if any products went low on stock after the sale
      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (product && product.stock <= 10) {
          await createNotification(
            req.shopId,
            req.user.id,
            'low_stock',
            'Low Stock Alert',
            `Product "${product.name}" is running low on stock after recent sale. Current quantity: ${product.stock} units.`,
            {
              productId: product.id,
              productName: product.name,
              stock: product.stock,
              saleId: sale.id,
            }
          );
        }
      }
    }

    // Fetch created sale with items
    const createdSale = await prisma.sale.findUnique({
      where: { id: sale.id },
      include: {
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                stock: true,
                categoryName: true,
                supplierId: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    res.status(201).json(createdSale);
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ error: 'Failed to create sale' });
  }
}

/**
 * Get recent items (frequently sold products)
 */
export async function getRecentItems(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const limit = parseInt(req.query.limit as string) || 10;

    // Get recent sale items with product info
    const recentItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          shopId: req.shopId,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            categoryName: true,
            supplierId: true,
          },
        },
        sale: {
          select: {
            createdAt: true,
          },
        },
      },
      orderBy: {
        sale: {
          createdAt: 'desc',
        },
      },
      take: limit,
    });

    res.json(recentItems);
  } catch (error) {
    console.error('Get recent items error:', error);
    res.status(500).json({ error: 'Failed to fetch recent items' });
  }
}

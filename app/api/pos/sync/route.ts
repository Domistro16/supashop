import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, getShopId } from '@/lib/middleware/auth';

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
  createdAt?: string;
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

function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const shopId = getShopId(request);
    if (!shopId) {
      return NextResponse.json({ error: 'Shop context required' }, { status: 400 });
    }

    const body: SyncRequest = await request.json();
    const { sales } = body;

    if (!sales || !Array.isArray(sales) || sales.length === 0) {
      return NextResponse.json({ error: 'At least one sale is required' }, { status: 400 });
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
              shopId,
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

        // Validate products exist
        let validItems = true;
        for (const item of offlineSale.items) {
          const product = await prisma.product.findFirst({
            where: {
              id: item.productId,
              shopId,
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

        // Validate customer if provided
        let customerId: string | null = null;
        if (offlineSale.customerId) {
          const customer = await prisma.customer.findFirst({
            where: {
              id: offlineSale.customerId,
              shopId,
            },
          });
          if (customer) {
            customerId = customer.id;
          }
        }

        // Create sale and sync record in a transaction
        const result = await prisma.$transaction(async (tx) => {
          // Create sale
          const newSale = await tx.sale.create({
            data: {
              orderId: generateOrderId(),
              shopId,
              staffId: authResult.user!.id,
              customerId: customerId,
              totalAmount: offlineSale.totalAmount,
            },
          });

          // Create sale items and update product stock
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
              shopId,
              clientTempId: offlineSale.clientTempId,
              saleId: newSale.id,
            },
          });

          // Log activity
          await tx.activityLog.create({
            data: {
              shopId,
              staffId: authResult.user!.id,
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
            const customer = await prisma.customer.findUnique({
              where: { id: customerId },
              include: { loyaltyPoint: true },
            });

            if (customer) {
              await prisma.customer.update({
                where: { id: customerId },
                data: {
                  totalSpent: { increment: Number(offlineSale.totalAmount) },
                  visitCount: { increment: 1 },
                  lastVisit: new Date(),
                },
              });

              // Update loyalty points
              const pointsToAdd = Math.floor(Number(offlineSale.totalAmount) / 100);

              if (customer.loyaltyPoint) {
                const newPoints = customer.loyaltyPoint.points + pointsToAdd;

                let tier = 'bronze';
                if (newPoints >= 10000) tier = 'platinum';
                else if (newPoints >= 5000) tier = 'gold';
                else if (newPoints >= 1000) tier = 'silver';

                await prisma.loyaltyPoint.update({
                  where: { customerId },
                  data: {
                    points: newPoints,
                    tier,
                  },
                });
              }
            }
          } catch (error) {
            console.error('Failed to update customer stats:', error);
          }
        }

        // Create notification
        await prisma.notification.create({
          data: {
            shopId,
            userId: authResult.user.id,
            type: 'sale',
            title: 'Offline Sale Synced',
            message: `Offline sale synced: #${result.orderId} for ${offlineSale.totalAmount.toLocaleString()} with ${offlineSale.items.length} item(s).`,
            data: {
              saleId: result.id,
              orderId: result.orderId,
              clientTempId: offlineSale.clientTempId,
              totalAmount: offlineSale.totalAmount,
              itemCount: offlineSale.items.length,
            },
          },
        });

        // Check for low stock after sale
        for (const item of offlineSale.items) {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
          });

          if (product && product.stock <= 10) {
            await prisma.notification.create({
              data: {
                shopId,
                userId: authResult.user.id,
                type: 'low_stock',
                title: 'Low Stock Alert',
                message: `Product "${product.name}" is running low after offline sync. Current: ${product.stock} units.`,
                data: {
                  productId: product.id,
                  productName: product.name,
                  stock: product.stock,
                  saleId: result.id,
                },
              },
            });
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

    return NextResponse.json(response);
  } catch (error) {
    console.error('Sync offline sales error:', error);
    return NextResponse.json({ error: 'Failed to sync offline sales' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { verifyAuth, getShopId } from '@server/middleware/auth';
import { applySaleToLoyalty } from '@server/services/loyalty';

function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const shopId = getShopId(request);
    if (!shopId) {
      return NextResponse.json({ error: 'Shop context required' }, { status: 400 });
    }

    const sales = await prisma.sale.findMany({
      where: { shopId },
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
                costPrice: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Get sales error:', error);
    return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
  }
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

    const body = await request.json();
    const {
      items,
      totalAmount,
      customerId,
      paymentType = 'full',
      paymentMethod,
      bankName,
      accountNumber,
      amountPaid,
      notes,
      installments = [],
      pointsRedeemed = 0,
      clientTempId,
      fromOfflineSync = false,
    } = body;

    const trimmedNotes = typeof notes === 'string' && notes.trim().length > 0
      ? notes.trim().slice(0, 500)
      : null;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Offline-sync idempotency: if we've already processed this clientTempId, return the existing sale.
    if (clientTempId && typeof clientTempId === 'string') {
      const existingSync = await prisma.offlineSaleSync.findUnique({
        where: {
          shopId_clientTempId: { shopId, clientTempId },
        },
        include: {
          sale: { include: { installments: { orderBy: { createdAt: 'asc' } } } },
        },
      });
      if (existingSync) {
        return NextResponse.json(existingSync.sale);
      }
    }

    // Validate customer if provided
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: customerId,
          shopId,
        },
      });

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
    }

    // Validate products exist and have sufficient stock
    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: {
          id: item.productId,
          shopId,
        },
      });

      if (!product) {
        return NextResponse.json({
          error: `Product ${item.productId} not found`,
        }, { status: 404 });
      }

      if (!fromOfflineSync && product.stock < item.quantity) {
        return NextResponse.json({
          error: `Insufficient stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
        }, { status: 400 });
      }
    }

    // Calculate payment status and outstanding balance
    const installmentTotal = installments.reduce((sum: number, inst: any) => sum + Number(inst.amount), 0);
    const effectiveAmountPaid = installments.length > 0
      ? installmentTotal
      : (amountPaid !== undefined ? amountPaid : (paymentType === 'full' ? totalAmount : 0));
    const outstandingBalance = Math.max(0, totalAmount - effectiveAmountPaid);
    const paymentStatus = outstandingBalance > 0 ? 'pending' : 'completed';

    // Create sale and update stock in a transaction
    const sale = await prisma.$transaction(async (tx) => {
      // Create sale
      const newSale = await tx.sale.create({
        data: {
          orderId: generateOrderId(),
          shopId,
          staffId: authResult.user!.id,
          customerId: customerId || null,
          totalAmount,
          // Payment tracking fields
          paymentType,
          paymentMethod: paymentMethod || null,
          bankName: bankName || null,
          accountNumber: accountNumber || null,
          amountPaid: effectiveAmountPaid,
          outstandingBalance,
          paymentStatus,
        },
      });

      // Create installment records if any
      if (installments.length > 0) {
        for (const inst of installments) {
          const instNotes = typeof inst.notes === 'string' && inst.notes.trim().length > 0
            ? inst.notes.trim().slice(0, 500)
            : null;
          await tx.installment.create({
            data: {
              saleId: newSale.id,
              amount: inst.amount,
              paymentMethod: inst.paymentMethod || 'cash',
              bankName: inst.bankName || null,
              accountNumber: inst.accountNumber || null,
              notes: instNotes,
            },
          });
        }
      } else if (Number(effectiveAmountPaid) > 0) {
        // Automatically create an installment for the initial payment
        await tx.installment.create({
          data: {
            saleId: newSale.id,
            amount: effectiveAmountPaid,
            paymentMethod: paymentMethod || 'cash',
            bankName: bankName || null,
            accountNumber: accountNumber || null,
            notes: trimmedNotes,
          },
        });
      }

      // Create sale items and update product stock
      for (const item of items) {
        // Fetch current cost price to snapshot it
        const currentProduct = await tx.product.findUnique({
          where: { id: item.productId },
          select: { costPrice: true }
        });

        await tx.saleItem.create({
          data: {
            saleId: newSale.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            costPrice: currentProduct?.costPrice || 0, // Snapshot current cost
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

      // Offline-sync tombstone — lets retries be idempotent
      if (clientTempId && typeof clientTempId === 'string') {
        await tx.offlineSaleSync.create({
          data: {
            shopId,
            clientTempId,
            saleId: newSale.id,
          },
        });
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          shopId,
          staffId: authResult.user!.id,
          action: fromOfflineSync ? 'sync_offline_sale' : 'record_sale',
          details: {
            saleId: newSale.id,
            orderId: newSale.orderId,
            totalAmount: totalAmount.toString(),
            itemCount: items.length,
            ...(clientTempId ? { clientTempId } : {}),
          },
        },
      });

      return tx.sale.findUnique({
        where: { id: newSale.id },
        include: { installments: { orderBy: { createdAt: 'asc' } } },
      });
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
              totalSpent: { increment: Number(totalAmount) },
              visitCount: { increment: 1 },
              lastVisit: new Date(),
            },
          });

          await applySaleToLoyalty({
            customerId,
            shopId,
            totalAmount: Number(totalAmount),
            pointsRedeemed: Number(pointsRedeemed) || 0,
          });
        }
      } catch (error) {
        console.error('Failed to update customer stats:', error);
      }
    }

    // Create notification and check low stock
    await prisma.notification.create({
      data: {
        shopId,
        userId: authResult.user.id,
        type: 'sale',
        title: 'New Sale Recorded',
        message: `Sale #${sale.orderId} completed for ${totalAmount.toLocaleString()} with ${items.length} item(s).`,
        data: {
          saleId: sale.id,
          orderId: sale.orderId,
          totalAmount,
          itemCount: items.length,
        },
      },
    });

    // Check if any products went low on stock
    for (const item of items) {
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
            message: `Product "${product.name}" is running low on stock after recent sale. Current quantity: ${product.stock} units.`,
            data: {
              productId: product.id,
              productName: product.name,
              stock: product.stock,
              saleId: sale.id,
            },
          },
        });
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
                costPrice: true,
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

    return NextResponse.json(createdSale, { status: 201 });
  } catch (error) {
    console.error('Create sale error:', error);
    return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 });
  }
}

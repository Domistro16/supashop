import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { verifyAuth, getShopId } from '@server/middleware/auth';

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
      installments = []
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
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

      if (product.stock < item.quantity) {
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
          await tx.installment.create({
            data: {
              saleId: newSale.id,
              amount: inst.amount,
              paymentMethod: inst.paymentMethod || 'cash',
              bankName: inst.bankName || null,
              accountNumber: inst.accountNumber || null,
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

      // Log activity
      await tx.activityLog.create({
        data: {
          shopId,
          staffId: authResult.user!.id,
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

          // Update loyalty points (1 point per 100 spent)
          const pointsToAdd = Math.floor(Number(totalAmount) / 100);

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

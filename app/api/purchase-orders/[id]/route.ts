import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { verifyAuth, getShopId } from '@server/middleware/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const shopId = getShopId(request);
    if (!shopId) {
      return NextResponse.json({ error: 'Shop context required' }, { status: 400 });
    }

    const { id } = await params;

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: { id, shopId },
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
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    return NextResponse.json({ purchaseOrder });
  } catch (error) {
    console.error('Get purchase order error:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase order' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const shopId = getShopId(request);
    if (!shopId) {
      return NextResponse.json({ error: 'Shop context required' }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();
    const { notes, items } = body;

    const existingPO = await prisma.purchaseOrder.findFirst({
      where: { id, shopId },
    });

    if (!existingPO) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    if (existingPO.status !== 'draft') {
      return NextResponse.json({ error: 'Can only update draft purchase orders' }, { status: 400 });
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
            where: { id: item.productId, shopId },
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

    return NextResponse.json({ purchaseOrder: updatedPO });
  } catch (error: any) {
    console.error('Update purchase order error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update purchase order' }, { status: 500 });
  }
}

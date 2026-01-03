import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { verifyAuth, getShopId } from '@server/middleware/auth';

export async function POST(
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
    const { items } = body;

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: { id, shopId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, stock: true } },
          },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    if (!['sent', 'partial'].includes(purchaseOrder.status)) {
      return NextResponse.json({ error: 'Can only receive sent or partial purchase orders' }, { status: 400 });
    }

    // Process received items
    const receivedItems: Array<{ itemId: string; quantityReceived: number }> = [];

    if (items && Array.isArray(items)) {
      // Partial receive - specific items
      for (const item of items) {
        if (!item.itemId || !item.quantityReceived || item.quantityReceived <= 0) {
          return NextResponse.json({ error: 'Each item must have itemId and positive quantityReceived' }, { status: 400 });
        }

        const poItem = purchaseOrder.items.find(i => i.id === item.itemId);
        if (!poItem) {
          return NextResponse.json({ error: `Item ${item.itemId} not found in this PO` }, { status: 404 });
        }

        const remaining = poItem.quantityOrdered - poItem.quantityReceived;
        if (item.quantityReceived > remaining) {
          return NextResponse.json({
            error: `Cannot receive more than ordered. Item ${poItem.product.name}: ordered ${poItem.quantityOrdered}, already received ${poItem.quantityReceived}, remaining ${remaining}`,
          }, { status: 400 });
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
      return NextResponse.json({ error: 'No items to receive' }, { status: 400 });
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

    return NextResponse.json({
      purchaseOrder: finalPO,
      received: receivedItems,
      isFullyReceived,
    });
  } catch (error) {
    console.error('Receive purchase order error:', error);
    return NextResponse.json({ error: 'Failed to receive purchase order' }, { status: 500 });
  }
}

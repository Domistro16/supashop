import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, getShopId } from '@/lib/middleware/auth';

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

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: { id, shopId },
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
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    if (purchaseOrder.status !== 'draft') {
      return NextResponse.json({ error: 'Can only send draft purchase orders' }, { status: 400 });
    }

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

    return NextResponse.json({
      purchaseOrder: updatedPO,
      notification: { message: 'Purchase order sent to supplier (email notification would be sent here)' },
    });
  } catch (error) {
    console.error('Send purchase order error:', error);
    return NextResponse.json({ error: 'Failed to send purchase order' }, { status: 500 });
  }
}

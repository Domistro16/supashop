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

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: { id, shopId },
    });

    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
    }

    if (!['draft', 'sent'].includes(purchaseOrder.status)) {
      return NextResponse.json({ error: 'Can only cancel draft or sent purchase orders' }, { status: 400 });
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

    return NextResponse.json({ purchaseOrder: updatedPO });
  } catch (error) {
    console.error('Cancel purchase order error:', error);
    return NextResponse.json({ error: 'Failed to cancel purchase order' }, { status: 500 });
  }
}

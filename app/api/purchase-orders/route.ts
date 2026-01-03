import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, getShopId } from '@/lib/middleware/auth';

function generatePONumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 5);
  return `PO-${timestamp}-${random}`.toUpperCase();
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const supplierId = searchParams.get('supplierId') || undefined;

    const where: any = { shopId };
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

    return NextResponse.json({ purchaseOrders });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 });
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
    const { supplierId, items, notes } = body;

    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Validate supplier exists and belongs to shop
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, shopId },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Validate products exist and belong to shop
    let totalAmount = 0;
    const validatedItems: Array<{ productId: string; quantityOrdered: number; unitCost: number }> = [];

    for (const item of items) {
      if (!item.productId || !item.quantityOrdered || item.quantityOrdered <= 0) {
        return NextResponse.json({ error: 'Each item must have productId and positive quantityOrdered' }, { status: 400 });
      }

      const product = await prisma.product.findFirst({
        where: { id: item.productId, shopId },
      });

      if (!product) {
        return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
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
          shopId,
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

    return NextResponse.json({ purchaseOrder: completePO }, { status: 201 });
  } catch (error) {
    console.error('Create purchase order error:', error);
    return NextResponse.json({ error: 'Failed to create purchase order' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { verifyAuth, getShopId } from '@server/middleware/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
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

    const { saleId } = await params;

    // Verify sale belongs to shop
    const sale = await prisma.sale.findFirst({
      where: {
        id: saleId,
        shopId,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
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

    return NextResponse.json(saleItems);
  } catch (error) {
    console.error('Get sale items error:', error);
    return NextResponse.json({ error: 'Failed to fetch sale items' }, { status: 500 });
  }
}

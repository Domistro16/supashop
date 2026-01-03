import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { verifyAuth, getShopId } from '@server/middleware/auth';

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
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get recent sale items with product info
    const recentItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          shopId,
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

    return NextResponse.json(recentItems);
  } catch (error) {
    console.error('Get recent items error:', error);
    return NextResponse.json({ error: 'Failed to fetch recent items' }, { status: 500 });
  }
}

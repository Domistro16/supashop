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

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    return NextResponse.json(shop);
  } catch (error) {
    console.error('Get shop error:', error);
    return NextResponse.json({ error: 'Failed to fetch shop' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    const { name, address, target } = body;

    const shop = await prisma.shop.update({
      where: { id: shopId },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(target !== undefined && { target }),
      },
    });

    return NextResponse.json(shop);
  } catch (error) {
    console.error('Update shop error:', error);
    return NextResponse.json({ error: 'Failed to update shop' }, { status: 500 });
  }
}

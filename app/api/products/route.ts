import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, getShopId } from '@/lib/middleware/auth';

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

    const products = await prisma.product.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
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
    const { name, stock, price, categoryName, supplierId } = body;

    if (!name || stock === undefined || price === undefined) {
      return NextResponse.json(
        { error: 'Name, stock, and price are required' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        shopId,
        name,
        stock,
        price,
        categoryName,
        supplierId: supplierId || null,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        shopId,
        staffId: authResult.user.id,
        action: 'add_product',
        details: {
          productId: product.id,
          productName: product.name,
        },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

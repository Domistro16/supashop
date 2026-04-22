import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { verifyAuth, getShopId } from '@server/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let shopId = getShopId(request);

    // Fallback to query param if not in header (for internal/admin calls)
    if (!shopId) {
      const { searchParams } = new URL(request.url);
      shopId = searchParams.get('shopId');
    }

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
    const { name, stock, price, categoryName, supplierId, costPrice, barcode, packSize, packName } = body;

    if (!name || stock === undefined || price === undefined) {
      return NextResponse.json(
        { error: 'Name, stock, and price are required' },
        { status: 400 }
      );
    }

    const normalizedBarcode = typeof barcode === 'string' && barcode.trim() ? barcode.trim() : null;
    const normalizedPackSize = Number.isFinite(Number(packSize)) && Number(packSize) >= 1
      ? Math.floor(Number(packSize))
      : 1;
    const normalizedPackName = typeof packName === 'string' && packName.trim().length > 0
      ? packName.trim().slice(0, 40)
      : null;

    if (normalizedBarcode) {
      const existing = await prisma.product.findFirst({
        where: { shopId, barcode: normalizedBarcode },
      });
      if (existing) {
        return NextResponse.json(
          { error: `Barcode already used by product "${existing.name}"` },
          { status: 409 }
        );
      }
    }

    const product = await prisma.product.create({
      data: {
        shopId,
        name,
        stock,
        price,
        categoryName,
        supplierId: supplierId || null,
        costPrice: costPrice || null,
        barcode: normalizedBarcode,
        packSize: normalizedPackSize,
        packName: normalizedPackName,
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

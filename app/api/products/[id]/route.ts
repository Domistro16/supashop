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

    const product = await prisma.product.findFirst({
      where: { id, shopId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
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
    const { name, stock, price, categoryName, supplierId, costPrice, barcode, packSize, packName } = body;

    const product = await prisma.product.findFirst({
      where: { id, shopId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    let normalizedBarcode: string | null | undefined = undefined;
    if (barcode !== undefined) {
      normalizedBarcode = typeof barcode === 'string' && barcode.trim() ? barcode.trim() : null;
      if (normalizedBarcode) {
        const clash = await prisma.product.findFirst({
          where: { shopId, barcode: normalizedBarcode, NOT: { id } },
        });
        if (clash) {
          return NextResponse.json(
            { error: `Barcode already used by product "${clash.name}"` },
            { status: 409 }
          );
        }
      }
    }

    let normalizedPackSize: number | undefined = undefined;
    if (packSize !== undefined) {
      const n = Number(packSize);
      if (!Number.isFinite(n) || n < 1) {
        return NextResponse.json({ error: 'Pack size must be at least 1' }, { status: 400 });
      }
      normalizedPackSize = Math.floor(n);
    }
    let normalizedPackName: string | null | undefined = undefined;
    if (packName !== undefined) {
      normalizedPackName = typeof packName === 'string' && packName.trim().length > 0
        ? packName.trim().slice(0, 40)
        : null;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(stock !== undefined && { stock }),
        ...(price !== undefined && { price }),
        ...(categoryName !== undefined && { categoryName }),
        ...(supplierId !== undefined && { supplierId }),
        ...(costPrice !== undefined && { costPrice }),
        ...(normalizedBarcode !== undefined && { barcode: normalizedBarcode }),
        ...(normalizedPackSize !== undefined && { packSize: normalizedPackSize }),
        ...(normalizedPackName !== undefined && { packName: normalizedPackName }),
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
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

    const product = await prisma.product.findFirst({
      where: { id, shopId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

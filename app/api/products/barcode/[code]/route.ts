import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { verifyAuth, getShopId } from '@server/middleware/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
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

    const { code } = await params;
    const barcode = decodeURIComponent(code).trim();
    if (!barcode) {
      return NextResponse.json({ error: 'Barcode required' }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { shopId, barcode },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Get product by barcode error:', error);
    return NextResponse.json({ error: 'Failed to look up product' }, { status: 500 });
  }
}

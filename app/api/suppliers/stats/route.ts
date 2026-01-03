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

    const totalSuppliers = await prisma.supplier.count({
      where: { shopId },
    });

    const suppliers = await prisma.supplier.findMany({
      where: { shopId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    const totalProducts = suppliers.reduce((sum, s) => sum + s._count.products, 0);
    const activeSuppliers = suppliers.filter((s) => s._count.products > 0).length;

    // Get top suppliers by product count
    const topSuppliers = suppliers
      .sort((a, b) => b._count.products - a._count.products)
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        name: s.name,
        productCount: s._count.products,
        totalSpent: s.totalSpent,
      }));

    return NextResponse.json({
      stats: {
        totalSuppliers,
        activeSuppliers,
        totalProducts,
        topSuppliers,
      },
    });
  } catch (error) {
    console.error('Get supplier stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch supplier statistics' }, { status: 500 });
  }
}

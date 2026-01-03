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

    const totalCustomers = await prisma.customer.count({
      where: { shopId },
    });

    const newCustomersThisMonth = await prisma.customer.count({
      where: {
        shopId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    const topCustomers = await prisma.customer.findMany({
      where: { shopId },
      orderBy: { totalSpent: 'desc' },
      take: 5,
      include: {
        loyaltyPoint: true,
      },
    });

    const avgCustomerValue = await prisma.customer.aggregate({
      where: { shopId },
      _avg: {
        totalSpent: true,
      },
    });

    const loyaltyTierDistribution = await prisma.loyaltyPoint.groupBy({
      by: ['tier'],
      where: {
        customer: {
          shopId,
        },
      },
      _count: {
        tier: true,
      },
    });

    return NextResponse.json({
      totalCustomers,
      newCustomersThisMonth,
      topCustomers,
      avgCustomerValue: avgCustomerValue._avg.totalSpent || 0,
      loyaltyTierDistribution,
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch customer statistics' }, { status: 500 });
  }
}

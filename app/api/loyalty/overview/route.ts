import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { verifyAuth, getShopId } from '@server/middleware/auth';
import { getLoyaltySettings } from '@server/services/loyalty';

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

    const settings = await getLoyaltySettings(shopId);

    const [tierBuckets, topMembers, totalMembers, totalActivePoints] = await Promise.all([
      prisma.loyaltyPoint.groupBy({
        by: ['tier'],
        where: { customer: { shopId } },
        _count: { tier: true },
      }),
      prisma.customer.findMany({
        where: { shopId, loyaltyPoint: { isNot: null } },
        include: { loyaltyPoint: true },
        orderBy: { loyaltyPoint: { points: 'desc' } },
        take: 10,
      }),
      prisma.loyaltyPoint.count({ where: { customer: { shopId } } }),
      prisma.loyaltyPoint.aggregate({
        where: { customer: { shopId } },
        _sum: { points: true },
      }),
    ]);

    const tierDistribution = tierBuckets.map((b) => ({
      tier: b.tier,
      count: b._count.tier,
    }));

    return NextResponse.json({
      settings,
      totalMembers,
      totalActivePoints: totalActivePoints._sum.points ?? 0,
      tierDistribution,
      topMembers: topMembers.map((c) => ({
        id: c.id,
        name: c.name,
        points: c.loyaltyPoint?.points ?? 0,
        tier: c.loyaltyPoint?.tier ?? 'bronze',
        totalSpent: Number(c.totalSpent),
      })),
    });
  } catch (error) {
    console.error('Loyalty overview error:', error);
    return NextResponse.json({ error: 'Failed to load loyalty overview' }, { status: 500 });
  }
}

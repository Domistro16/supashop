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

    const staffShops = await prisma.staffShop.findMany({
      where: {
        shopId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    const staff = staffShops.map((ss) => ({
      id: ss.user.id,
      name: ss.user.name,
      email: ss.user.email,
      role: ss.role.name,
      roleId: ss.role.id,
      joinedAt: ss.joinedAt,
      createdAt: ss.user.createdAt,
    }));

    return NextResponse.json(staff);
  } catch (error) {
    console.error('Get staff error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
  }
}

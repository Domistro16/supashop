import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { verifyAuth } from '@server/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const staffShops = await prisma.staffShop.findMany({
      where: {
        userId: authResult.user.id,
        isActive: true,
      },
      include: {
        shop: true,
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const shops = staffShops.map((staffShop) => ({
      id: staffShop.shop.id,
      name: staffShop.shop.name,
      address: staffShop.shop.address,
      target: staffShop.shop.target,
      role: staffShop.role.name,
      permissions: staffShop.role.rolePermissions.map((rp) => rp.permission.name),
      joinedAt: staffShop.joinedAt,
    }));

    return NextResponse.json(shops);
  } catch (error) {
    console.error('Get my shops error:', error);
    return NextResponse.json({ error: 'Failed to fetch shops' }, { status: 500 });
  }
}

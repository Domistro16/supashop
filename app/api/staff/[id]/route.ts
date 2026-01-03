import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, getShopId } from '@/lib/middleware/auth';

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

    const staffShop = await prisma.staffShop.findFirst({
      where: {
        userId: id,
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
    });

    if (!staffShop) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: staffShop.user.id,
      name: staffShop.user.name,
      email: staffShop.user.email,
      role: staffShop.role.name,
      roleId: staffShop.role.id,
      joinedAt: staffShop.joinedAt,
      createdAt: staffShop.user.createdAt,
    });
  } catch (error) {
    console.error('Get staff by ID error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff member' }, { status: 500 });
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

    // Prevent owner from being removed
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (shop && shop.ownerId === id) {
      return NextResponse.json({ error: 'Cannot remove shop owner' }, { status: 403 });
    }

    // Find and deactivate staff-shop relationship
    const staffShop = await prisma.staffShop.findFirst({
      where: {
        userId: id,
        shopId,
        isActive: true,
      },
    });

    if (!staffShop) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    await prisma.staffShop.update({
      where: { id: staffShop.id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Staff member removed successfully' });
  } catch (error) {
    console.error('Remove staff error:', error);
    return NextResponse.json({ error: 'Failed to remove staff member' }, { status: 500 });
  }
}

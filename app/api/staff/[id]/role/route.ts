import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, getShopId } from '@/lib/middleware/auth';

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
    const { roleId } = body;

    if (!roleId) {
      return NextResponse.json({ error: 'RoleId is required' }, { status: 400 });
    }

    // Verify role exists and belongs to shop
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        shopId,
      },
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Find and update staff-shop relationship
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

    // Prevent owner from changing their own role
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (shop && shop.ownerId === id) {
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 403 });
    }

    await prisma.staffShop.update({
      where: { id: staffShop.id },
      data: { roleId },
    });

    return NextResponse.json({ message: 'Staff role updated successfully' });
  } catch (error) {
    console.error('Update staff role error:', error);
    return NextResponse.json({ error: 'Failed to update staff role' }, { status: 500 });
  }
}

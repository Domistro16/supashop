import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, getShopId } from '@/lib/middleware/auth';
import bcrypt from 'bcryptjs';

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
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    const invites = staffShops.map((ss) => ({
      id: ss.id,
      name: ss.user.name,
      email: ss.user.email,
      role: ss.role.name,
      accepted: ss.isActive,
    }));

    return NextResponse.json(invites);
  } catch (error) {
    console.error('Get staff invites error:', error);
    return NextResponse.json({ error: 'Failed to fetch staff invites' }, { status: 500 });
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
    const { email, roleId } = body;

    if (!email || !roleId) {
      return NextResponse.json({ error: 'Email and roleId are required' }, { status: 400 });
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

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    let tempPassword: string | null = null;
    let isNewUser = false;

    // If user doesn't exist, create a new user with a temporary password
    if (!user) {
      tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-6).toUpperCase();
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      isNewUser = true;

      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: email.split('@')[0],
        },
      });
    }

    // Check if user is already staff at this shop
    const existingStaffShop = await prisma.staffShop.findFirst({
      where: {
        userId: user.id,
        shopId,
      },
    });

    if (existingStaffShop) {
      if (existingStaffShop.isActive) {
        return NextResponse.json({ error: 'User is already a staff member' }, { status: 400 });
      } else {
        // Re-activate if previously deactivated
        await prisma.staffShop.update({
          where: { id: existingStaffShop.id },
          data: {
            isActive: true,
            roleId,
          },
        });
      }
    } else {
      // Create new staff-shop relationship
      await prisma.staffShop.create({
        data: {
          userId: user.id,
          shopId,
          roleId,
        },
      });
    }

    return NextResponse.json({
      message: 'Staff member invited successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tempPassword,
      isNewUser,
    }, { status: 201 });
  } catch (error) {
    console.error('Invite staff error:', error);
    return NextResponse.json({ error: 'Failed to invite staff member' }, { status: 500 });
  }
}

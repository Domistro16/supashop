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

    const roles = await prisma.role.findMany({
      where: { shopId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            staffShops: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formattedRoles = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        description: rp.permission.description,
        category: rp.permission.category,
      })),
      staffCount: role._count.staffShops,
      createdAt: role.createdAt,
    }));

    return NextResponse.json(formattedRoles);
  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
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
    const { name, description, permissionIds } = body;

    if (!name || !permissionIds || permissionIds.length === 0) {
      return NextResponse.json({ error: 'Name and at least one permission are required' }, { status: 400 });
    }

    // Check if role name already exists for this shop
    const existingRole = await prisma.role.findFirst({
      where: {
        shopId,
        name,
      },
    });

    if (existingRole) {
      return NextResponse.json({ error: 'Role with this name already exists' }, { status: 400 });
    }

    // Verify all permissions exist
    const permissions = await prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
      },
    });

    if (permissions.length !== permissionIds.length) {
      return NextResponse.json({ error: 'Some permissions are invalid' }, { status: 400 });
    }

    // Create role with permissions
    const role = await prisma.role.create({
      data: {
        shopId,
        name,
        description,
        rolePermissions: {
          create: permissionIds.map((permissionId: string) => ({
            permissionId,
          })),
        },
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map((rp) => rp.permission),
    }, { status: 201 });
  } catch (error) {
    console.error('Create role error:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}

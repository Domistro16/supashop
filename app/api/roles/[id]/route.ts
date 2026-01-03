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
    const { name, description, permissionIds } = body;

    // Find role
    const role = await prisma.role.findFirst({
      where: {
        id,
        shopId,
      },
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Prevent updating system roles
    if (role.isSystem) {
      return NextResponse.json({ error: 'Cannot modify system role' }, { status: 403 });
    }

    // If updating permissions, verify they exist
    if (permissionIds) {
      const permissions = await prisma.permission.findMany({
        where: {
          id: { in: permissionIds },
        },
      });

      if (permissions.length !== permissionIds.length) {
        return NextResponse.json({ error: 'Some permissions are invalid' }, { status: 400 });
      }
    }

    // Update role in a transaction
    await prisma.$transaction(async (tx) => {
      // Update role basic info
      await tx.role.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
        },
      });

      // Update permissions if provided
      if (permissionIds) {
        // Delete existing permissions
        await tx.rolePermission.deleteMany({
          where: { roleId: id },
        });

        // Create new permissions
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId: string) => ({
            roleId: id,
            permissionId,
          })),
        });
      }
    });

    // Fetch updated role with permissions
    const roleWithPermissions = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: roleWithPermissions!.id,
      name: roleWithPermissions!.name,
      description: roleWithPermissions!.description,
      isSystem: roleWithPermissions!.isSystem,
      permissions: roleWithPermissions!.rolePermissions.map((rp) => rp.permission),
    });
  } catch (error) {
    console.error('Update role error:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
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

    // Find role
    const role = await prisma.role.findFirst({
      where: {
        id,
        shopId,
      },
      include: {
        _count: {
          select: {
            staffShops: true,
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Prevent deleting system roles
    if (role.isSystem) {
      return NextResponse.json({ error: 'Cannot delete system role' }, { status: 403 });
    }

    // Prevent deleting role if staff members are assigned to it
    if (role._count.staffShops > 0) {
      return NextResponse.json({
        error: `Cannot delete role with ${role._count.staffShops} staff member(s) assigned`,
      }, { status: 400 });
    }

    await prisma.role.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Role deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Delete role error:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}

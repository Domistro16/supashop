import { Response } from 'express';
import { AuthRequest, CreateRoleRequest, UpdateRoleRequest } from '../types';
import { prisma } from '@server/prisma';



/**
 * Get all roles for the current shop
 */
export async function getRoles(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const roles = await prisma.role.findMany({
      where: { shopId: req.shopId },
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

    res.json(formattedRoles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
}

/**
 * Get all available permissions
 */
export async function getPermissions(req: AuthRequest, res: Response) {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Group by category
    const grouped = permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, typeof permissions>);

    res.json({
      all: permissions,
      byCategory: grouped,
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
}

/**
 * Create a new role
 */
export async function createRole(req: AuthRequest, res: Response) {
  try {
    const { name, description, permissionIds }: CreateRoleRequest = req.body;

    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    if (!name || !permissionIds || permissionIds.length === 0) {
      return res.status(400).json({ error: 'Name and at least one permission are required' });
    }

    // Check if role name already exists for this shop
    const existingRole = await prisma.role.findFirst({
      where: {
        shopId: req.shopId,
        name,
      },
    });

    if (existingRole) {
      return res.status(400).json({ error: 'Role with this name already exists' });
    }

    // Verify all permissions exist
    const permissions = await prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
      },
    });

    if (permissions.length !== permissionIds.length) {
      return res.status(400).json({ error: 'Some permissions are invalid' });
    }

    // Create role with permissions
    const role = await prisma.role.create({
      data: {
        shopId: req.shopId,
        name,
        description,
        rolePermissions: {
          create: permissionIds.map((permissionId) => ({
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

    res.status(201).json({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map((rp) => rp.permission),
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
}

/**
 * Update a role
 */
export async function updateRole(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, permissionIds }: UpdateRoleRequest = req.body;

    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    // Find role
    const role = await prisma.role.findFirst({
      where: {
        id,
        shopId: req.shopId,
      },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent updating system roles
    if (role.isSystem) {
      return res.status(403).json({ error: 'Cannot modify system role' });
    }

    // If updating permissions, verify they exist
    if (permissionIds) {
      const permissions = await prisma.permission.findMany({
        where: {
          id: { in: permissionIds },
        },
      });

      if (permissions.length !== permissionIds.length) {
        return res.status(400).json({ error: 'Some permissions are invalid' });
      }
    }

    // Update role in a transaction
    const updatedRole = await prisma.$transaction(async (tx) => {
      // Update role basic info
      const updated = await tx.role.update({
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
          data: permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
        });
      }

      return updated;
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

    res.json({
      id: roleWithPermissions!.id,
      name: roleWithPermissions!.name,
      description: roleWithPermissions!.description,
      isSystem: roleWithPermissions!.isSystem,
      permissions: roleWithPermissions!.rolePermissions.map((rp) => rp.permission),
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
}

/**
 * Delete a role
 */
export async function deleteRole(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    // Find role
    const role = await prisma.role.findFirst({
      where: {
        id,
        shopId: req.shopId,
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
      return res.status(404).json({ error: 'Role not found' });
    }

    // Prevent deleting system roles
    if (role.isSystem) {
      return res.status(403).json({ error: 'Cannot delete system role' });
    }

    // Prevent deleting role if staff members are assigned to it
    if (role._count.staffShops > 0) {
      return res.status(400).json({
        error: `Cannot delete role with ${role._count.staffShops} staff member(s) assigned`,
      });
    }

    await prisma.role.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
}

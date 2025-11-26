import { Response } from 'express';
import { AuthRequest, InviteStaffRequest, UpdateStaffRoleRequest } from '../types';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/auth';

const prisma = new PrismaClient();

/**
 * Get all staff for the current shop
 */
export async function getStaff(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const staffShops = await prisma.staffShop.findMany({
      where: {
        shopId: req.shopId,
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

    res.json(staff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
}

/**
 * Get a single staff member by ID
 */
export async function getStaffById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const staffShop = await prisma.staffShop.findFirst({
      where: {
        userId: id,
        shopId: req.shopId,
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
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json({
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
    res.status(500).json({ error: 'Failed to fetch staff member' });
  }
}

/**
 * Invite a staff member (create new user or add existing user to shop)
 */
export async function inviteStaff(req: AuthRequest, res: Response) {
  try {
    const { email, roleId }: InviteStaffRequest = req.body;

    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    if (!email || !roleId) {
      return res.status(400).json({ error: 'Email and roleId are required' });
    }

    // Verify role exists and belongs to shop
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        shopId: req.shopId,
      },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // If user doesn't exist, create a new user with a temporary password
    if (!user) {
      const tempPassword = Math.random().toString(36).slice(-10);
      const passwordHash = await hashPassword(tempPassword);

      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: email.split('@')[0], // Use email prefix as temporary name
        },
      });

      // TODO: Send invitation email with temporary password or invitation link
    }

    // Check if user is already staff at this shop
    const existingStaffShop = await prisma.staffShop.findFirst({
      where: {
        userId: user.id,
        shopId: req.shopId,
      },
    });

    if (existingStaffShop) {
      if (existingStaffShop.isActive) {
        return res.status(400).json({ error: 'User is already a staff member' });
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
          shopId: req.shopId,
          roleId,
        },
      });
    }

    res.status(201).json({
      message: 'Staff member invited successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Invite staff error:', error);
    res.status(500).json({ error: 'Failed to invite staff member' });
  }
}

/**
 * Update staff member's role
 */
export async function updateStaffRole(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { roleId }: UpdateStaffRoleRequest = req.body;

    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    if (!roleId) {
      return res.status(400).json({ error: 'RoleId is required' });
    }

    // Verify role exists and belongs to shop
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        shopId: req.shopId,
      },
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Find and update staff-shop relationship
    const staffShop = await prisma.staffShop.findFirst({
      where: {
        userId: id,
        shopId: req.shopId,
        isActive: true,
      },
    });

    if (!staffShop) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Prevent owner from changing their own role
    const shop = await prisma.shop.findUnique({
      where: { id: req.shopId },
    });

    if (shop && shop.ownerId === id) {
      return res.status(403).json({ error: 'Cannot change owner role' });
    }

    await prisma.staffShop.update({
      where: { id: staffShop.id },
      data: { roleId },
    });

    res.json({ message: 'Staff role updated successfully' });
  } catch (error) {
    console.error('Update staff role error:', error);
    res.status(500).json({ error: 'Failed to update staff role' });
  }
}

/**
 * Remove staff member from shop (deactivate)
 */
export async function removeStaff(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    // Prevent owner from being removed
    const shop = await prisma.shop.findUnique({
      where: { id: req.shopId },
    });

    if (shop && shop.ownerId === id) {
      return res.status(403).json({ error: 'Cannot remove shop owner' });
    }

    // Find and deactivate staff-shop relationship
    const staffShop = await prisma.staffShop.findFirst({
      where: {
        userId: id,
        shopId: req.shopId,
        isActive: true,
      },
    });

    if (!staffShop) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    await prisma.staffShop.update({
      where: { id: staffShop.id },
      data: { isActive: false },
    });

    res.json({ message: 'Staff member removed successfully' });
  } catch (error) {
    console.error('Remove staff error:', error);
    res.status(500).json({ error: 'Failed to remove staff member' });
  }
}

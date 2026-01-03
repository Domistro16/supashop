import { Response } from 'express';
import { AuthRequest } from '../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get shop information
 */
export async function getShop(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const shop = await prisma.shop.findUnique({
      where: { id: req.shopId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    res.json(shop);
  } catch (error) {
    console.error('Get shop error:', error);
    res.status(500).json({ error: 'Failed to fetch shop' });
  }
}

/**
 * Update shop information
 */
export async function updateShop(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const { name, address, target } = req.body;

    const shop = await prisma.shop.update({
      where: { id: req.shopId },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(target !== undefined && { target }),
      },
    });

    res.json(shop);
  } catch (error) {
    console.error('Update shop error:', error);
    res.status(500).json({ error: 'Failed to update shop' });
  }
}

/**
 * Get all shops for the current user
 */
export async function getMyShops(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const staffShops = await prisma.staffShop.findMany({
      where: {
        userId: req.user.id,
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

    res.json(shops);
  } catch (error) {
    console.error('Get my shops error:', error);
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
}

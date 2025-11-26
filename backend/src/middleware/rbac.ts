import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get user permissions for a specific shop
 */
export async function getUserPermissions(
  userId: string,
  shopId: string
): Promise<string[]> {
  const staffShop = await prisma.staffShop.findFirst({
    where: {
      userId,
      shopId,
      isActive: true,
    },
    include: {
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

  if (!staffShop) {
    return [];
  }

  return staffShop.role.rolePermissions.map((rp) => rp.permission.name);
}

/**
 * Middleware to check if user has required permission
 */
export function requirePermission(permission: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.shopId) {
        return res.status(400).json({ error: 'Shop context required (x-shop-id header)' });
      }

      const permissions = await getUserPermissions(req.user.id, req.shopId);

      if (!permissions.includes(permission)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: permission,
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Middleware to check if user has any of the required permissions
 */
export function requireAnyPermission(permissions: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.shopId) {
        return res.status(400).json({ error: 'Shop context required (x-shop-id header)' });
      }

      const userPermissions = await getUserPermissions(req.user.id, req.shopId);
      const hasPermission = permissions.some((p) => userPermissions.includes(p));

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: permissions,
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Middleware to check if user is shop owner
 */
export function requireOwner() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.shopId) {
        return res.status(400).json({ error: 'Shop context required (x-shop-id header)' });
      }

      const shop = await prisma.shop.findUnique({
        where: { id: req.shopId },
      });

      if (!shop || shop.ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Owner access required' });
      }

      next();
    } catch (error) {
      console.error('Owner check error:', error);
      return res.status(500).json({ error: 'Owner check failed' });
    }
  };
}

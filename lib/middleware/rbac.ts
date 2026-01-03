import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { PrismaClient } from '@prisma/client';
import { can, User as PermissionUser, Role } from '@/lib/backend/permissions';

const prisma = new PrismaClient();

/**
 * Get user permissions for a specific shop
 * @deprecated Use the centralized can() function from permissions.ts instead
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
 * Get user's role and owner status for a shop
 */
async function getUserRoleInfo(
  userId: string,
  shopId: string
): Promise<{ role: Role | null; isOwner: boolean }> {
  const [shop, staffShop] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerId: true },
    }),
    prisma.staffShop.findFirst({
      where: {
        userId,
        shopId,
        isActive: true,
      },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const isOwner = shop?.ownerId === userId;
  const role = (staffShop?.role?.name as Role) || null;

  return { role, isOwner };
}

/**
 * Middleware to check if user has required permission using centralized permission checker
 */
export function requirePermission(action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.shopId) {
        return res.status(400).json({ error: 'Shop context required (x-shop-id header)' });
      }

      // Get user's role and owner status
      const { role, isOwner } = await getUserRoleInfo(req.user.id, req.shopId);

      if (!role && !isOwner) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: action,
        });
      }

      // Build permission user object
      const permissionUser: PermissionUser = {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: role || undefined,
        isOwner,
      };

      // Get resource from params or body for resource-level checks
      const resource = req.params || req.body || undefined;

      // Check permission using centralized can() function
      if (!can(permissionUser, action, resource)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: action,
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      console.error('User:', req.user?.id, 'Shop:', req.shopId, 'Action:', action);
      return res.status(500).json({ error: 'Permission check failed', details: String(error) });
    }
  };
}

/**
 * Middleware to check if user has any of the required permissions using centralized permission checker
 */
export function requireAnyPermission(actions: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.shopId) {
        return res.status(400).json({ error: 'Shop context required (x-shop-id header)' });
      }

      // Get user's role and owner status
      const { role, isOwner } = await getUserRoleInfo(req.user.id, req.shopId);

      if (!role && !isOwner) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: actions,
        });
      }

      // Build permission user object
      const permissionUser: PermissionUser = {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: role || undefined,
        isOwner,
      };

      // Get resource from params or body for resource-level checks
      const resource = req.params || req.body || undefined;

      // Check if user has any of the required permissions
      const hasPermission = actions.some((action) => can(permissionUser, action, resource));

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: actions,
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

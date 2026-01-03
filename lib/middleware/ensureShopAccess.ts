import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all shop IDs that a user has access to (owned shops + staff shops)
 */
async function getUserShopIds(userId: string): Promise<string[]> {
  const [ownedShops, staffShops] = await Promise.all([
    prisma.shop.findMany({
      where: { ownerId: userId },
      select: { id: true },
    }),
    prisma.staffShop.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: { shopId: true },
    }),
  ]);

  const shopIds = new Set<string>();
  ownedShops.forEach((shop) => shopIds.add(shop.id));
  staffShops.forEach((staffShop) => shopIds.add(staffShop.shopId));

  return Array.from(shopIds);
}

/**
 * Middleware to ensure user has access to the requested shop
 * Checks shopId from req.params, req.body, req.query, or req.headers['x-shop-id']
 * Returns 401 if user is missing, 400 if shopId is missing, 403 if user doesn't have access
 */
export default async function ensureShopAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Extract shopId from various sources (in order of precedence)
    const shopId =
      req.params.shopId ||
      req.body.shopId ||
      req.query.shopId ||
      (req.headers['x-shop-id'] as string);

    // Check if shopId is provided
    if (!shopId) {
      return res.status(400).json({
        error: 'Shop ID is required',
        message: 'Provide shopId in params, body, query, or x-shop-id header',
      });
    }

    // Get user's accessible shop IDs
    const userShopIds = await getUserShopIds(req.user.id);

    // Check if user has access to the requested shop
    if (!userShopIds.includes(shopId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this shop',
      });
    }

    // Attach shopIds to user object for downstream use
    req.user.shopIds = userShopIds;
    req.shopId = shopId;

    next();
  } catch (error) {
    console.error('Shop access check error:', error);
    return res.status(500).json({ error: 'Failed to verify shop access' });
  }
}




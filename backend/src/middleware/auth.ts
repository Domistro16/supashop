import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/auth';

/**
 * Middleware to authenticate requests using JWT
 */
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    req.user = {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware to set shop context from header
 */
export function setShopContext(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const shopId = req.headers['x-shop-id'] as string;

  if (shopId) {
    req.shopId = shopId;
  }

  next();
}

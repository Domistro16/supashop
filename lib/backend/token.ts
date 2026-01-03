import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Refresh token expiry: 30 days
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const REFRESH_TOKEN_BYTES = 32; // 256 bits

/**
 * Generate a secure random token string
 */
function generateTokenString(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

/**
 * Create a refresh token for a user
 * Returns the token string and the database record
 */
export async function createRefreshToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateTokenString();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

/**
 * Verify a refresh token
 * Returns the token record if valid, null otherwise
 */
export async function verifyRefreshToken(token: string): Promise<{
  id: string;
  userId: string;
  token: string;
  revoked: boolean;
  expiresAt: Date;
  createdAt: Date;
} | null> {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!refreshToken) {
    return null;
  }

  // Check if token is revoked
  if (refreshToken.revoked) {
    return null;
  }

  // Check if token is expired
  if (new Date() > refreshToken.expiresAt) {
    return null;
  }

  return refreshToken;
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revoked: true },
  });
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revoked: false,
    },
    data: { revoked: true },
  });
}

/**
 * Rotate refresh token: revoke old token and create new one
 */
export async function rotateRefreshToken(
  oldToken: string,
  userId: string
): Promise<{ token: string; expiresAt: Date }> {
  // Revoke old token
  await revokeRefreshToken(oldToken);

  // Create new token
  return createRefreshToken(userId);
}




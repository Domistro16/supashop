import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { generateToken } from '@server/utils/auth';
import { verifyRefreshToken, rotateRefreshToken } from '@server/backend/token';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token not provided' },
        { status: 401 }
      );
    }

    // Verify refresh token
    const tokenRecord = await verifyRefreshToken(refreshToken);

    if (!tokenRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: tokenRecord.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    // Rotate refresh token (revoke old, create new)
    const { token: newRefreshToken, expiresAt } = await rotateRefreshToken(
      refreshToken,
      user.id
    );

    // Set new refresh token cookie
    const isProduction = process.env.NODE_ENV === 'production';
    cookieStore.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/',
    });

    // Generate new access token
    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({ token: accessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}

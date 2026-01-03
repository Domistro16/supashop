import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, generateToken } from '@/lib/utils/auth';
import { createRefreshToken } from '@/lib/backend/token';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get user's shops and roles
    const staffShops = await prisma.staffShop.findMany({
      where: {
        userId: user.id,
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

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    // Create refresh token
    const { token: refreshToken, expiresAt } = await createRefreshToken(user.id);

    // Set refresh token cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieStore = await cookies();
    cookieStore.set('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      path: '/',
    });

    // Format shops with roles and permissions
    const shops = staffShops.map((staffShop) => ({
      id: staffShop.shop.id,
      name: staffShop.shop.name,
      role: staffShop.role.name,
      permissions: staffShop.role.rolePermissions.map((rp) => rp.permission.name),
    }));

    // Return response
    const response = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
      shops,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { error: 'Failed to sign in' },
      { status: 500 }
    );
  }
}

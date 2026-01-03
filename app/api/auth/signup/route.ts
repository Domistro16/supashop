import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/utils/auth';
import { getUserPermissions } from '@/lib/middleware/rbac';
import { createDefaultRoles } from '@/lib/utils/defaultRoles';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, shopName, shopAddress } = body;

    // Validate input
    if (!email || !password || !firstName || !lastName || !shopName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, firstName, lastName, shopName' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user, shop, owner role, and staff-shop relationship in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: `${firstName} ${lastName}`,
        },
      });

      // Create shop
      const shop = await tx.shop.create({
        data: {
          name: shopName,
          address: shopAddress,
          ownerId: user.id,
        },
      });

      // Get all permissions for owner role
      const allPermissions = await tx.permission.findMany();

      // Create owner role with all permissions
      const ownerRole = await tx.role.create({
        data: {
          shopId: shop.id,
          name: 'owner',
          description: 'Shop owner with full access',
          isSystem: true,
          rolePermissions: {
            create: allPermissions.map((permission) => ({
              permissionId: permission.id,
            })),
          },
        },
      });

      // Create staff-shop relationship
      await tx.staffShop.create({
        data: {
          userId: user.id,
          shopId: shop.id,
          roleId: ownerRole.id,
        },
      });

      // Create default roles (manager, cashier, clerk)
      await createDefaultRoles(tx, shop.id);

      return { user, shop, role: ownerRole };
    });

    // Generate JWT token
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
    });

    // Get user permissions
    const permissions = await getUserPermissions(result.user.id, result.shop.id);

    // Return response
    const response = {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      token,
      shops: [
        {
          id: result.shop.id,
          name: result.shop.name,
          role: 'owner',
          permissions,
        },
      ],
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

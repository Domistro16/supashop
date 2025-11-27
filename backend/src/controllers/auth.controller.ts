import { Response } from 'express';
import { AuthRequest, SignUpRequest, SignInRequest, AuthResponse } from '../types';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { getUserPermissions } from '../middleware/rbac';
import { createDefaultRoles } from '../utils/defaultRoles';


const prisma = new PrismaClient();

/**
 * Sign up a new user and create their shop
 */
export async function signUp(req: AuthRequest, res: Response) {
  try {
    const { email, password, firstName, lastName, shopName, shopAddress }: SignUpRequest = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName || !shopName) {
      return res.status(400).json({
        error: 'Missing required fields: email, password, firstName, lastName, shopName',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
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
    const response: AuthResponse = {
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

    res.status(201).json(response);
  } catch (error) {
    console.error('Sign up error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
}

/**
 * Sign in an existing user
 */
export async function signIn(req: AuthRequest, res: Response) {
  try {
    const { email, password }: SignInRequest = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
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

    // Format shops with roles and permissions
    const shops = staffShops.map((staffShop) => ({
      id: staffShop.shop.id,
      name: staffShop.shop.name,
      role: staffShop.role.name,
      permissions: staffShop.role.rolePermissions.map((rp) => rp.permission.name),
    }));

    // Return response
    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
      shops,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
}

/**
 * Get current user info
 */
export async function getMe(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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

    const shops = staffShops.map((staffShop) => ({
      id: staffShop.shop.id,
      name: staffShop.shop.name,
      role: staffShop.role.name,
      permissions: staffShop.role.rolePermissions.map((rp) => rp.permission.name),
    }));

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      shops,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
}

/**
 * Update user profile
 */
export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name: name.trim() },
    });

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

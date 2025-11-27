import { PrismaClient } from '@prisma/client';

/**
 * Default role templates with permission names
 */
export const DEFAULT_ROLE_TEMPLATES = {
  manager: {
    name: 'manager',
    description: 'Manager with full access except shop deletion and role management',
    permissions: [
      // Products - full access
      'products:read',
      'products:create',
      'products:update',
      'products:delete',
      // Sales - full access
      'sales:read',
      'sales:create',
      'sales:update',
      'sales:delete',
      // Staff - manage but not delete
      'staff:read',
      'staff:create',
      'staff:update',
      // Shop - read and update only
      'shop:read',
      'shop:update',
      // Analytics
      'analytics:read',
    ],
  },
  cashier: {
    name: 'cashier',
    description: 'Cashier focused on sales operations',
    permissions: [
      // Products - read only
      'products:read',
      // Sales - full access
      'sales:read',
      'sales:create',
      'sales:update',
      'sales:delete',
      // Analytics
      'analytics:read',
    ],
  },
  clerk: {
    name: 'clerk',
    description: 'Inventory clerk focused on product management',
    permissions: [
      // Products - full access
      'products:read',
      'products:create',
      'products:update',
      'products:delete',
      // Sales - read only
      'sales:read',
    ],
  },
};

/**
 * Create default roles for a shop
 * @param tx - Prisma transaction client
 * @param shopId - Shop ID to create roles for
 */
export async function createDefaultRoles(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  shopId: string
) {
  // Get all permissions
  const allPermissions = await tx.permission.findMany();
  const permissionMap = new Map(allPermissions.map((p) => [p.name, p.id]));

  const createdRoles = [];

  // Create each default role
  for (const [key, template] of Object.entries(DEFAULT_ROLE_TEMPLATES)) {
    // Get permission IDs for this role
    const permissionIds = template.permissions
      .map((permName) => permissionMap.get(permName))
      .filter((id): id is string => id !== undefined);

    if (permissionIds.length === 0) {
      console.warn(`No valid permissions found for role: ${template.name}`);
      continue;
    }

    // Create the role
    const role = await tx.role.create({
      data: {
        shopId,
        name: template.name,
        description: template.description,
        isSystem: false, // These are default templates, not system roles
        rolePermissions: {
          create: permissionIds.map((permissionId) => ({
            permissionId,
          })),
        },
      },
    });

    createdRoles.push(role);
  }

  return createdRoles;
}

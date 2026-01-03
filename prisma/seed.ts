import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Define all permissions
  const permissions = [
    // Products permissions
    { name: 'products:read', description: 'View products', category: 'products' },
    { name: 'products:create', description: 'Create new products', category: 'products' },
    { name: 'products:update', description: 'Update existing products', category: 'products' },
    { name: 'products:delete', description: 'Delete products', category: 'products' },

    // Sales permissions
    { name: 'sales:read', description: 'View sales and transactions', category: 'sales' },
    { name: 'sales:create', description: 'Record new sales', category: 'sales' },
    { name: 'sales:update', description: 'Update sales records', category: 'sales' },
    { name: 'sales:delete', description: 'Delete sales records', category: 'sales' },

    // Staff permissions
    { name: 'staff:read', description: 'View staff members', category: 'staff' },
    { name: 'staff:create', description: 'Invite new staff members', category: 'staff' },
    { name: 'staff:update', description: 'Update staff information', category: 'staff' },
    { name: 'staff:delete', description: 'Remove staff members', category: 'staff' },
    { name: 'staff:manage_roles', description: 'Assign and modify staff roles', category: 'staff' },

    // Shop permissions
    { name: 'shop:read', description: 'View shop information', category: 'shop' },
    { name: 'shop:update', description: 'Update shop settings', category: 'shop' },
    { name: 'shop:delete', description: 'Delete shop', category: 'shop' },

    // Roles permissions (owner-only)
    { name: 'roles:read', description: 'View roles and permissions', category: 'roles' },
    { name: 'roles:create', description: 'Create new roles', category: 'roles' },
    { name: 'roles:update', description: 'Update role permissions', category: 'roles' },
    { name: 'roles:delete', description: 'Delete roles', category: 'roles' },

    // Analytics/Reports permissions
    { name: 'analytics:read', description: 'View analytics and reports', category: 'analytics' },
  ];

  // Upsert permissions
  console.log('📝 Creating permissions...');
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }
  console.log(`✅ Created ${permissions.length} permissions`);

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

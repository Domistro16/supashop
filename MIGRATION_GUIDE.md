# Supabase to PostgreSQL Migration Guide

This guide explains how to migrate from Supabase to the new PostgreSQL backend with RBAC.

## Overview

The migration involves:
1. **Backend**: New Express/TypeScript API with PostgreSQL + Prisma
2. **Frontend**: Replace Supabase client calls with new API client
3. **Auth**: JWT-based authentication instead of Supabase Auth
4. **RBAC**: New role-based access control system

## Quick Start

### 1. Setup Backend

```bash
cd backend

# Start PostgreSQL (using Docker)
docker-compose up -d

# Install dependencies
npm install

# Setup database
npm run db:generate
npm run db:migrate
npm run db:seed

# Start backend
npm run dev
```

Backend will run on `http://localhost:3001`

### 2. Update Frontend Environment

The `.env` file has been updated:

```bash
# New Backend API
VITE_API_BASE_URL=http://localhost:3001/api
```

### 3. Start Frontend

```bash
npm run dev
```

## Code Migration

### Import Changes

**Before (Supabase):**
```typescript
import { supabase } from "@/supabaseClient";
import { getProducts, addProduct } from "@/supabaseClient";
```

**After (New API):**
```typescript
import api from "@/lib/api";
// or specific imports:
import { products, auth, sales } from "@/lib/api";
```

### Authentication

**Before:**
```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email,
  password,
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// Sign out
await supabase.auth.signOut();

// Get user
const { data: { user } } = await supabase.auth.getUser();
```

**After:**
```typescript
// Sign up
const response = await api.auth.signUp({
  email,
  password,
  firstName,
  lastName,
  shopName,
  shopAddress,
});

// Sign in
const response = await api.auth.signIn(email, password);

// Sign out
await api.auth.signOut();
window.location.href = '/signin';

// Get user (from context)
const { user, shops, currentShop } = useAuth();
```

### Auth Context

**Before:**
```typescript
const { user, session } = useAuth();
```

**After:**
```typescript
const { user, shops, currentShop, setCurrentShop } = useAuth();

// Check authentication
const { isAuthenticated } = useAuth();

// Refresh auth after changes
await refreshAuth();
```

### Products

**Before:**
```typescript
// Get all products
const products = await getProducts();

// Get single product
const product = await getProduct(id);

// Add product
await addProduct({ name, stock, price, categoryName, dealer });

// Get categories
const categories = await getCategories();

// Get dealers
const dealers = await getDealers();
```

**After:**
```typescript
// Get all products
const productsList = await api.products.getAll();

// Get single product
const product = await api.products.getById(id);

// Create product
await api.products.create({ name, stock, price, categoryName, dealer });

// Update product
await api.products.update(id, { name, stock, price });

// Delete product
await api.products.delete(id);

// Get categories
const categories = await api.products.getCategories();

// Get dealers
const dealers = await api.products.getDealers();
```

### Sales

**Before:**
```typescript
// Get sales
const sales = await getSales();

// Get sale items
const items = await getSaleItems(saleId);

// Record sale
await record_sale(items);

// Get recent items
const recentItems = await getRecentItems();
```

**After:**
```typescript
// Get sales
const salesList = await api.sales.getAll();

// Get sale with items
const sale = await api.sales.getById(id);

// Get sale items
const items = await api.sales.getItems(saleId);

// Create sale
await api.sales.create({
  items: [{ productId, quantity, price }],
  totalAmount
});

// Get recent items
const recentItems = await api.sales.getRecentItems(10);
```

### Staff

**Before:**
```typescript
// Get staff (profiles)
const profiles = await getProfiles();

// Get staff by ID
const staff = await getStaff(id);
```

**After:**
```typescript
// Get all staff
const staffList = await api.staff.getAll();

// Get staff by ID
const staff = await api.staff.getById(id);

// Invite staff
await api.staff.invite({ email, roleId });

// Update staff role
await api.staff.updateRole(staffId, newRoleId);

// Remove staff
await api.staff.remove(staffId);
```

### Shops

**Before:**
```typescript
// Get shop
const shop = await getShop();
```

**After:**
```typescript
// Get all user's shops
const shops = await api.shops.getMyShops();

// Get current shop
const shop = await api.shops.getCurrent();

// Update shop
await api.shops.update({ name, address, target });

// Set current shop (from context)
const { setCurrentShop } = useAuth();
setCurrentShop(shopId);
```

### NEW: Roles & Permissions

```typescript
// Get all roles
const roles = await api.roles.getAll();

// Get all permissions
const { all, byCategory } = await api.roles.getPermissions();

// Create role
await api.roles.create({
  name: "Manager",
  description: "Store manager",
  permissionIds: ["products:read", "products:create", "sales:read"]
});

// Update role
await api.roles.update(roleId, {
  name: "Senior Manager",
  permissionIds: ["products:read", "products:create", "sales:read", "sales:create"]
});

// Delete role
await api.roles.delete(roleId);

// Check permissions
import { permissions } from "@/lib/api";

if (permissions.check('products:create')) {
  // User can create products
}

if (permissions.checkAny(['products:create', 'products:update'])) {
  // User can create OR update products
}

if (permissions.isOwner()) {
  // User is shop owner
}
```

## UI Components

### Permission-Based Rendering

Use the `permissions` helper to conditionally render UI elements:

```typescript
import { permissions } from "@/lib/api";

function ProductsPage() {
  return (
    <div>
      <h1>Products</h1>

      {/* Only show to users with products:create permission */}
      {permissions.check('products:create') && (
        <Button onClick={createProduct}>Add Product</Button>
      )}

      {/* Show to owners only */}
      {permissions.isOwner() && (
        <Button onClick={openSettings}>Settings</Button>
      )}
    </div>
  );
}
```

### Shop Selector

Add the shop selector to your header/navigation:

```typescript
import { ShopSelector } from "@/components/common/ShopSelector";

function Header() {
  return (
    <header>
      <ShopSelector />
      {/* other header content */}
    </header>
  );
}
```

### Protected Routes

**Before:**
```typescript
function ProtectedPage({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/signin" />;
  }

  return children;
}
```

**After:**
```typescript
function ProtectedPage({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" />;
  }

  return children;
}
```

## Error Handling

The new API throws errors that need to be caught:

```typescript
try {
  const products = await api.products.getAll();
  setProducts(products);
} catch (error) {
  console.error('Failed to load products:', error);
  toast.error(error.message || 'Failed to load products');
}
```

## Component Updates Required

### Authentication Pages

1. **SignIn.tsx**: Update to use `api.auth.signIn()`
2. **SignUp.tsx**: Update to use `api.auth.signUp()`

### Product Pages

1. **Products/index.tsx**: Use `api.products.getAll()`
2. **Products/AddProductForm.tsx**: Use `api.products.create()`

### Sales Pages

1. **Transaction/index.tsx**: Use `api.sales.getAll()`
2. **Transaction/[orderId].tsx**: Use `api.sales.getById()`

### Staff Pages

1. **Staff/index.tsx**: Use `api.staff.getAll()`
2. **Staff/AddStaff.tsx**: Use `api.staff.invite()`

### Dashboard

1. **Dashboard/index.tsx**: Use various API calls for dashboard data

### Layout Components

1. **Header.tsx**: Add `<ShopSelector />` component
2. **Sidebar.tsx**: Add permission checks for menu items

## New Features

### Role Management (NEW)

Create a new page for managing roles (owner-only):

```typescript
import { useState, useEffect } from 'react';
import api from '@/lib/api';

function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [rolesData, permsData] = await Promise.all([
      api.roles.getAll(),
      api.roles.getPermissions()
    ]);
    setRoles(rolesData);
    setPermissions(permsData.all);
  }

  async function createRole(name, description, permissionIds) {
    await api.roles.create({ name, description, permissionIds });
    await loadData();
  }

  // ... rest of component
}
```

## Testing

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `npm run dev`
3. Sign up a new user
4. Create products
5. Record sales
6. Invite staff members
7. Create custom roles
8. Test permissions

## Deployment

### Backend

```bash
# Build
npm run build

# Set environment variables
export DATABASE_URL="postgresql://..."
export JWT_SECRET="your-production-secret"
export PORT=3001
export NODE_ENV=production

# Run migrations
npx prisma migrate deploy

# Start
npm start
```

### Frontend

Update `.env.production`:

```bash
VITE_API_BASE_URL=https://your-api-domain.com/api
```

## Troubleshooting

### "Shop context required" error

Make sure to:
1. Be signed in
2. Have a shop selected
3. Check that `x-shop-id` header is being sent (handled by API client)

### Permission denied errors

Check:
1. User's role has the required permission
2. Using `api.permissions.check()` for UI rendering
3. Backend middleware is correctly configured

### Token expired

User needs to sign in again. The frontend will automatically redirect to `/signin`.

## Migration Checklist

- [ ] Backend setup complete
- [ ] Database migrated and seeded
- [ ] Frontend `.env` updated
- [ ] Auth pages updated (SignIn, SignUp)
- [ ] Products pages updated
- [ ] Sales pages updated
- [ ] Staff pages updated
- [ ] Dashboard updated
- [ ] Header includes ShopSelector
- [ ] Sidebar includes permission checks
- [ ] Role management page created
- [ ] All components tested
- [ ] Production deployment configured

## Support

For issues or questions:
- Backend README: `backend/README.md`
- Backend Setup: `backend/SETUP.md`
- API Documentation: `backend/README.md#api-endpoints`

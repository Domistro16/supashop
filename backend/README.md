# SupaShop Backend API

Backend API for SupaShop with PostgreSQL database and Role-Based Access Control (RBAC).

## Features

- **Authentication**: JWT-based authentication with signup/signin
- **RBAC**: Comprehensive role and permission system
- **Multi-tenant**: Support for multiple shops per user
- **Products Management**: CRUD operations for products
- **Sales Tracking**: Record and view sales transactions
- **Staff Management**: Invite and manage staff members
- **Role Management**: Create custom roles with specific permissions

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Update `DATABASE_URL` with your PostgreSQL connection string:

```
DATABASE_URL="postgresql://user:password@localhost:5432/supashop?schema=public"
```

### 3. Setup Database

Make sure PostgreSQL is running, then run migrations:

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed permissions
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`.

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user and create shop
- `POST /api/auth/signin` - Sign in existing user
- `GET /api/auth/me` - Get current user info

### Shops

- `GET /api/shops/my-shops` - Get all shops for current user
- `GET /api/shops` - Get current shop info (requires `x-shop-id` header)
- `PUT /api/shops` - Update shop info

### Products

- `GET /api/products` - List all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/categories` - Get unique categories
- `GET /api/products/dealers` - Get unique dealers

### Sales

- `GET /api/sales` - List all sales
- `GET /api/sales/:id` - Get single sale with items
- `POST /api/sales` - Record new sale
- `GET /api/sales/:saleId/items` - Get items for a sale
- `GET /api/sales/recent-items` - Get recently sold items

### Staff

- `GET /api/staff` - List all staff members
- `GET /api/staff/:id` - Get single staff member
- `POST /api/staff/invite` - Invite new staff member
- `PUT /api/staff/:id/role` - Update staff role
- `DELETE /api/staff/:id` - Remove staff member

### Roles & Permissions

- `GET /api/roles` - List all roles
- `GET /api/roles/permissions` - List all available permissions
- `POST /api/roles` - Create new role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Most endpoints also require a shop context via the `x-shop-id` header:

```
x-shop-id: <shop-id>
```

## Permissions

The following permissions are available:

### Products
- `products:read` - View products
- `products:create` - Create products
- `products:update` - Update products
- `products:delete` - Delete products

### Sales
- `sales:read` - View sales
- `sales:create` - Record sales
- `sales:update` - Update sales
- `sales:delete` - Delete sales

### Staff
- `staff:read` - View staff
- `staff:create` - Invite staff
- `staff:update` - Update staff info
- `staff:delete` - Remove staff
- `staff:manage_roles` - Assign roles to staff

### Shop
- `shop:read` - View shop info
- `shop:update` - Update shop settings
- `shop:delete` - Delete shop

### Roles
- `roles:read` - View roles
- `roles:create` - Create roles
- `roles:update` - Update roles
- `roles:delete` - Delete roles

### Analytics
- `analytics:read` - View analytics and reports

## Database Schema

The database includes the following main tables:

- `users` - User accounts
- `shops` - Shop information
- `staff_shops` - Many-to-many relationship between users and shops
- `roles` - Shop-specific roles
- `permissions` - Available permissions
- `role_permissions` - Many-to-many relationship between roles and permissions
- `products` - Product inventory
- `sales` - Sales transactions
- `sale_items` - Items in each sale
- `activity_logs` - Audit logs

## Development

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Reset database (careful!)
npx prisma migrate reset

# Deploy migrations to production
npx prisma migrate deploy
```

### Prisma Studio

View and edit data in the browser:

```bash
npx prisma studio
```

## Production

### Build

```bash
npm run build
```

### Start

```bash
npm start
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - Secret key for JWT signing
- `JWT_EXPIRES_IN` - JWT expiration time (default: 7d)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:5173)

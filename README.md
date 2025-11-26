# SupaShop - Shop Management Platform with RBAC

A modern shop management SaaS platform with comprehensive role-based access control, built with React, TypeScript, Express, and PostgreSQL.

## Overview

SupaShop is an online shop dashboard platform where shop owners can sign up, create their shops, and manage staff, products, transactions, and sales with fine-grained permission control.

### Key Features

- **Multi-tenant Architecture**: Shop owners and staff can work with multiple shops
- **Role-Based Access Control (RBAC)**: Granular permissions for different staff roles
- **Product Management**: Full CRUD operations with inventory tracking
- **Sales Tracking**: Record and analyze sales transactions
- **Staff Management**: Invite staff, assign roles, and manage permissions
- **Shop Selection**: Easy switching between multiple shops for staff
- **Real-time Updates**: Activity logging and audit trails

## Project Structure

```
supashop/
├── backend/                 # Express + TypeScript API
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Auth & RBAC middleware
│   │   ├── routes/          # API routes
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Helper functions
│   ├── prisma/             # Database schema & migrations
│   ├── README.md           # Backend documentation
│   └── SETUP.md            # Setup instructions
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── lib/               # API client & utilities
│   └── auth.tsx           # Auth context
├── MIGRATION_GUIDE.md     # Migration instructions
└── README.md              # This file
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Docker (optional, for PostgreSQL)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Start PostgreSQL (using Docker)
docker-compose up -d

# Install dependencies
npm install

# Setup database
npm run db:generate
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

Backend runs on `http://localhost:3001`

### Frontend Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5173`

## Migration from Supabase

This project has been migrated from Supabase to a self-hosted PostgreSQL backend. See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed migration instructions.

### What's New

#### Backend
- **Express API** with TypeScript
- **Prisma ORM** for database operations
- **JWT Authentication** replacing Supabase Auth
- **Custom RBAC** with granular permissions
- **PostgreSQL** instead of Supabase PostgreSQL

#### Frontend
- **New API Client** (`src/lib/api.ts`) replacing Supabase client
- **Enhanced Auth Context** with shop management
- **Shop Selector** component for multi-shop users
- **Permission-based UI** rendering

## Features

### Authentication
- Email/password authentication
- JWT-based sessions
- Multi-shop support per user

### RBAC System

The system includes the following permission categories:

- **Products**: `products:read`, `products:create`, `products:update`, `products:delete`
- **Sales**: `sales:read`, `sales:create`, `sales:update`, `sales:delete`
- **Staff**: `staff:read`, `staff:create`, `staff:update`, `staff:delete`, `staff:manage_roles`
- **Shop**: `shop:read`, `shop:update`, `shop:delete`
- **Roles**: `roles:read`, `roles:create`, `roles:update`, `roles:delete`
- **Analytics**: `analytics:read`

### Default Roles

- **Owner**: Full access to all features (created automatically)
- **Custom Roles**: Can be created by owners with specific permissions

## API Documentation

See [backend/README.md](./backend/README.md) for complete API documentation.

### Key Endpoints

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Sign in
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/sales` - List sales
- `POST /api/sales` - Record sale
- `GET /api/staff` - List staff
- `POST /api/staff/invite` - Invite staff member
- `GET /api/roles` - List roles
- `POST /api/roles` - Create custom role

## Environment Variables

### Backend (.env)

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/supashop
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)

```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

## Database Schema

Key tables:
- `users` - User accounts
- `shops` - Shop information
- `staff_shops` - Many-to-many user-shop relationship
- `roles` - Shop-specific roles
- `permissions` - Available permissions
- `role_permissions` - Role-permission mappings
- `products` - Product inventory
- `sales` - Sales transactions
- `sale_items` - Transaction line items
- `activity_logs` - Audit trail

See [backend/prisma/schema.prisma](./backend/prisma/schema.prisma) for complete schema.

## Deployment

### Backend

```bash
cd backend

# Build
npm run build

# Set production environment variables
export DATABASE_URL="your-production-db-url"
export JWT_SECRET="your-production-secret"
export NODE_ENV=production

# Run migrations
npx prisma migrate deploy

# Start
npm start
```

### Frontend

```bash
# Build
npm run build

# Deploy dist/ folder to your hosting provider
```

## Tech Stack

### Backend
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- bcrypt for password hashing

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Radix UI
- React Router v7
- React Hook Form
- Zod validation
- ApexCharts

## Support

For issues or questions:
- Backend docs: `backend/README.md`
- Backend setup: `backend/SETUP.md`
- Migration guide: `MIGRATION_GUIDE.md`

## License

MIT License

## Acknowledgments

Built on top of [TailAdmin React Dashboard Template](https://github.com/TailAdmin/free-react-tailwind-admin-dashboard)

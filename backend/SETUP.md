# Backend Setup Guide

## Quick Start with Docker

The easiest way to set up PostgreSQL is using Docker:

### 1. Start PostgreSQL

```bash
cd backend
docker-compose up -d
```

This will start a PostgreSQL instance on port 5432.

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (creates all tables)
npm run db:migrate

# Seed permissions
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be running at `http://localhost:3001`.

## Manual PostgreSQL Setup

If you prefer to install PostgreSQL manually:

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### macOS

```bash
brew install postgresql@15
brew services start postgresql@15
```

### Create Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE supashop;
CREATE USER supashop_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE supashop TO supashop_user;
\q
```

Update `.env` with your connection string:

```
DATABASE_URL="postgresql://supashop_user:your_password@localhost:5432/supashop?schema=public"
```

## Troubleshooting

### Prisma Engine Download Issues

If you encounter issues downloading Prisma engines:

```bash
# Try with checksum ignore
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate

# Or download engines manually
npx prisma generate --skip-prisma-engines-download
```

### Connection Issues

Test your PostgreSQL connection:

```bash
psql -h localhost -U postgres -d supashop
```

### Port Already in Use

If port 3001 is already in use, change it in `.env`:

```
PORT=3002
```

## Environment Variables

Required environment variables in `.env`:

```bash
# Database connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/supashop?schema=public"

# Server configuration
PORT=3001
NODE_ENV=development

# JWT authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173
```

## Database Commands

```bash
# View database in browser
npx prisma studio

# Create new migration
npx prisma migrate dev --name migration_name

# Reset database (destroys all data!)
npx prisma migrate reset

# Format schema file
npx prisma format
```

## Testing the API

Use curl or any API client:

### Sign Up

```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "shopName": "My Shop",
    "shopAddress": "123 Main St"
  }'
```

### Sign In

```bash
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@example.com",
    "password": "password123"
  }'
```

### Get Products (with auth)

```bash
curl http://localhost:3001/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-shop-id: YOUR_SHOP_ID"
```

## Next Steps

1. Start the backend: `npm run dev`
2. Update frontend to use the new API (see frontend migration guide)
3. Test all endpoints
4. Deploy to production

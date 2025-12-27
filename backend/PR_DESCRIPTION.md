# Implement Server-Side Tenant Isolation Middleware

## Summary

This PR implements server-side tenant isolation middleware (`ensureShopAccess`) to enforce shop-level access control across all shop-scoped routes. The middleware validates that authenticated users have access to the requested shop before allowing requests to proceed.

## Changes

### 1. New Middleware: `ensureShopAccess.ts`

- **Location**: `backend/src/middleware/ensureShopAccess.ts`
- **Functionality**:
  - Validates user authentication (returns 401 if missing)
  - Extracts `shopId` from multiple sources: `req.params.shopId`, `req.body.shopId`, `req.query.shopId`, or `req.headers['x-shop-id']`
  - Returns 400 if no `shopId` is provided
  - Fetches user's accessible shops (owned shops + active staff shops)
  - Returns 403 if user doesn't have access to the requested shop
  - Attaches `shopIds` array to `req.user` and sets `req.shopId` for downstream use

### 2. Type Updates

- **File**: `backend/src/types/index.ts`
- **Changes**: Extended `AuthRequest` interface to include `shopIds?: string[]` in the user object

### 3. Route Updates

All shop-scoped routes have been updated to use `ensureShopAccess` instead of `setShopContext`:

- ✅ `products.routes.ts` - Product CRUD operations
- ✅ `sales.routes.ts` - Sales and transaction operations
- ✅ `staff.routes.ts` - Staff management and invites
- ✅ `customers.routes.ts` - Customer management
- ✅ `suppliers.routes.ts` - Supplier management
- ✅ `roles.routes.ts` - Role and permission management
- ✅ `notifications.routes.ts` - Notification operations
- ✅ `ai.routes.ts` - AI-powered features
- ✅ `shops.routes.ts` - Shop-specific routes (excluding `/my-shops`)

**Note**: `auth.routes.ts` was not modified as it contains user-level routes that don't require shop context.

### 4. Test Suite

- **Location**: `backend/tests/middleware/ensureShopAccess.spec.ts`
- **Coverage**:
  - ✅ Missing user → 401
  - ✅ Missing shopId → 400
  - ✅ User without shop access → 403
  - ✅ Valid user with owned shop → calls next()
  - ✅ Valid user with staff shop → calls next()
  - ✅ shopId extraction from params, body, query, headers
  - ✅ Priority order (params > body > query > headers)
  - ✅ Multiple shops (owned + staff) in shopIds array
  - ✅ Error handling (500 on database errors)

### 5. Test Configuration

- **Jest Config**: `backend/jest.config.js`
- **Package.json**: Added Jest, ts-jest, and @types/jest dependencies
- **Scripts**: Added `test`, `test:watch`, and `test:coverage` scripts

## Security Improvements

1. **Tenant Isolation**: Prevents users from accessing shops they don't belong to
2. **Explicit Validation**: All shop-scoped routes now explicitly validate shop access
3. **Consistent Error Responses**: Standardized 401/400/403 responses for authentication and authorization failures

## Testing

Run tests with:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Manual Testing

### Test 1: Missing shopId
```bash
curl -X GET http://localhost:3001/api/products \
  -H "Authorization: Bearer <valid-token>"
# Expected: 400 Bad Request
```

### Test 2: Invalid token
```bash
curl -X GET http://localhost:3001/api/products \
  -H "Authorization: Bearer invalid-token" \
  -H "x-shop-id: shop-123"
# Expected: 401 Unauthorized (from authenticate middleware)
```

### Test 3: Unauthorized shop
```bash
curl -X GET http://localhost:3001/api/products \
  -H "Authorization: Bearer <valid-token>" \
  -H "x-shop-id: unauthorized-shop-id"
# Expected: 403 Forbidden
```

### Test 4: Valid access
```bash
curl -X GET http://localhost:3001/api/products \
  -H "Authorization: Bearer <valid-token>" \
  -H "x-shop-id: <user-accessible-shop-id>"
# Expected: 200 OK with products list
```

## Breaking Changes

⚠️ **None** - The middleware maintains backward compatibility by:
- Still setting `req.shopId` (existing controllers continue to work)
- Supporting the existing `x-shop-id` header pattern
- Adding validation without changing the request flow

## Migration Notes

- Controllers that previously relied on `setShopContext` will continue to work as `ensureShopAccess` also sets `req.shopId`
- The middleware now validates shop access, so unauthorized shop access attempts will be rejected with 403
- Users must ensure they include `shopId` in one of: params, body, query, or `x-shop-id` header




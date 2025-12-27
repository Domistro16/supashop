# Refresh Token Implementation

## Summary

This implementation adds a secure refresh token flow with server-side stored tokens and logout revocation to the SupaShop backend.

## Changes Made

### 1. Prisma Schema Update

**File**: `backend/prisma/schema.prisma`

Added `RefreshToken` model:
- `id`: UUID primary key
- `userId`: Foreign key to User (indexed)
- `token`: Unique token string
- `revoked`: Boolean flag (default: false)
- `expiresAt`: Expiration timestamp
- `createdAt`: Creation timestamp

**Next Step**: Run migration:
```bash
cd backend
npm run db:migrate
```

### 2. Token Utilities

**File**: `backend/src/lib/token.ts`

Created utility functions:
- `createRefreshToken(userId)`: Creates a new refresh token (30-day expiry)
- `verifyRefreshToken(token)`: Verifies token validity (checks revoked, expired)
- `revokeRefreshToken(token)`: Marks a token as revoked
- `revokeAllUserTokens(userId)`: Revokes all tokens for a user
- `rotateRefreshToken(oldToken, userId)`: Revokes old token and creates new one

### 3. Auth Controller Updates

**File**: `backend/src/controllers/auth.controller.ts`

#### Updated `signIn` function:
- Creates refresh token on successful login
- Sets httpOnly cookie with refresh token
- Cookie settings: httpOnly, sameSite=Lax, secure in production

#### New `refreshToken` function:
- Reads refresh token from cookie
- Verifies token validity
- Rotates token (revokes old, creates new)
- Returns new access token
- Sets new refresh token cookie

#### New `logout` function:
- Reads refresh token from cookie
- Revokes the token in database
- Clears refresh token cookie

### 4. Express Middleware

**File**: `backend/src/index.ts`

Added `cookie-parser` middleware to parse cookies from requests.

**Dependencies Added**:
- `cookie-parser`: ^1.4.6
- `@types/cookie-parser`: ^1.4.7

### 5. Routes

**File**: `backend/src/routes/auth.routes.ts`

Added new routes:
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and revoke token

### 6. Test Suite

**File**: `backend/tests/auth/refresh.spec.ts`

Comprehensive test coverage:
- ✅ Missing cookie → 401
- ✅ Invalid token → 401
- ✅ User not found → 401
- ✅ Valid token rotation → new access token
- ✅ Cookie settings (httpOnly, sameSite, secure)
- ✅ Logout revocation
- ✅ Error handling

## Security Features

1. **Server-Side Storage**: Refresh tokens stored in database for revocation capability
2. **Token Rotation**: Old tokens are revoked when new ones are issued
3. **HttpOnly Cookies**: Prevents XSS attacks
4. **Secure Flag**: Enabled in production for HTTPS-only transmission
5. **SameSite=Lax**: CSRF protection
6. **Expiration**: 30-day expiry for refresh tokens
7. **Revocation**: Tokens can be revoked on logout or security events

## API Endpoints

### POST /api/auth/refresh

**Request**: Cookie with `refreshToken`

**Response**:
```json
{
  "token": "new-access-token-jwt"
}
```

**Errors**:
- 401: Missing or invalid refresh token

### POST /api/auth/logout

**Request**: Cookie with `refreshToken` (optional)

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

## Testing

Run tests:
```bash
npm test
```

Run specific test:
```bash
npm test -- refresh.spec.ts
```

## Migration

To apply the database changes:

```bash
cd backend
npm run db:migrate
```

This will:
1. Create the `refresh_tokens` table
2. Add the foreign key relationship to `users`
3. Create indexes for performance

## Manual Testing

### Test Refresh Flow

1. **Login**:
```bash
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt
```

2. **Refresh Token**:
```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

3. **Logout**:
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookies.txt
```

### Test Token Revocation

1. Login and get refresh token
2. Use refresh token to get new access token
3. Logout (revokes token)
4. Try to refresh again → should return 401

## Notes

- Access tokens remain short-lived JWTs (default: 7 days, configurable via `JWT_EXPIRES_IN`)
- Refresh tokens are long-lived (30 days) but can be revoked
- Token rotation ensures old tokens are invalidated when new ones are issued
- All refresh token operations are database-backed for security




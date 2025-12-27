# Offline POS Sync API

This document describes the offline-first POS sync feature that allows clients to create sales while offline and synchronize them when connectivity is restored.

## Overview

The system uses **client-generated temporary IDs** (`clientTempId`) to track offline sales. When the client syncs, the server:
1. Checks if the `clientTempId` already exists (for idempotency)
2. Creates the sale and returns the server-generated ID
3. Stores the mapping for future deduplication

## Endpoint

### POST `/api/pos/sync`

Sync offline sales to the server.

**Authentication:** Required (Bearer token)  
**Permission:** `sales:create`  
**Header:** `x-shop-id` (required)

### Request Body

```json
{
  "sales": [
    {
      "clientTempId": "uuid-generated-by-client",
      "items": [
        {
          "productId": "product-uuid",
          "quantity": 2,
          "price": 15.99,
          "discountPercent": 0
        }
      ],
      "totalAmount": 31.98,
      "customerId": "optional-customer-uuid",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Response

```json
{
  "synced": [
    {
      "clientTempId": "uuid-generated-by-client",
      "serverId": "server-generated-sale-uuid",
      "orderId": "ORD-ABC123-XYZ",
      "status": "created"
    }
  ],
  "errors": [
    {
      "clientTempId": "failed-sale-uuid",
      "error": "Product xyz not found"
    }
  ]
}
```

### Status Values

| Status | Description |
|--------|-------------|
| `created` | New sale created on server |
| `existing` | Sale already exists (idempotent return) |

## Conflict Resolution Policy

| Scenario | Policy | Behavior |
|----------|--------|----------|
| **Insufficient Stock** | Server wins | Sale is accepted. Stock may go negative. |
| **Duplicate clientTempId** | Idempotent | Returns existing mapping without creating duplicate |
| **Invalid Product** | Error | Sale rejected. Product must exist. |
| **Invalid Customer** | Graceful | Sale accepted without customer association |

### Why "Server Wins for Inventory"?

Offline sales represent real transactions that already occurred. Rejecting them would cause data loss. Instead:
- The sale is recorded
- Stock is decremented (may go negative)
- A low-stock notification is created
- Staff can perform inventory adjustments later

## Client Implementation Guide

### Generating clientTempId

Use a UUID v4 for each offline sale:

```typescript
const clientTempId = crypto.randomUUID();
```

### Retry Logic

The endpoint is **idempotent**. Safe to retry on network failures:

```typescript
async function syncWithRetry(sales: OfflineSale[], maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/pos/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-shop-id': shopId,
        },
        body: JSON.stringify({ sales }),
      });
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

### Updating Local Storage

After successful sync:

```typescript
const result = await syncWithRetry(offlineSales);

for (const synced of result.synced) {
  // Update local storage with server ID
  await localDB.sales.update(synced.clientTempId, {
    serverId: synced.serverId,
    orderId: synced.orderId,
    synced: true,
  });
}

for (const error of result.errors) {
  // Mark as failed, may need manual intervention
  await localDB.sales.update(error.clientTempId, {
    syncError: error.error,
  });
}
```

## Database Schema

```prisma
model OfflineSaleSync {
  id           String   @id @default(uuid())
  shopId       String   @map("shop_id")
  clientTempId String   @map("client_temp_id")
  saleId       String   @unique @map("sale_id")
  createdAt    DateTime @default(now()) @map("created_at")

  shop Shop @relation(...)
  sale Sale @relation(...)

  @@unique([shopId, clientTempId])
  @@map("offline_sale_syncs")
}
```

The `@@unique([shopId, clientTempId])` constraint ensures idempotency per shop.

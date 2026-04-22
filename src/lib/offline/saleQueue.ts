// IndexedDB-backed queue for offline POS sales.
// Each entry holds the full create-sale payload plus a snapshotted shopId
// so drains hit the correct tenant regardless of which shop is active later.

const DB_NAME = 'supashop-offline';
const DB_VERSION = 1;
const STORE = 'sale_queue';

export interface QueuedSaleItem {
  productId: string;
  quantity: number;
  price: number;
  discountPercent?: number;
}

export interface QueuedSalePayload {
  items: QueuedSaleItem[];
  totalAmount: number;
  customerId?: string;
  paymentType?: 'full' | 'installment';
  paymentMethod?: 'cash' | 'bank_transfer' | 'card';
  amountPaid?: number;
  notes?: string;
  installments?: Array<{
    amount: number;
    paymentMethod: 'cash' | 'bank_transfer' | 'card';
    bankName?: string;
    accountNumber?: string;
    notes?: string;
  }>;
  pointsRedeemed?: number;
}

export interface QueuedSale {
  clientTempId: string;
  shopId: string;
  payload: QueuedSalePayload;
  createdAt: number;
  attempts: number;
  lastError?: string;
  lastAttemptAt?: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available in this environment'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'clientTempId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open offline queue DB'));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T> | T): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
        let settled = false;
        Promise.resolve(run(store))
          .then((value) => {
            transaction.oncomplete = () => {
              if (!settled) {
                settled = true;
                resolve(value);
              }
            };
            transaction.onerror = () => {
              if (!settled) {
                settled = true;
                reject(transaction.error || new Error('Queue transaction failed'));
              }
            };
            transaction.onabort = () => {
              if (!settled) {
                settled = true;
                reject(transaction.error || new Error('Queue transaction aborted'));
              }
            };
          })
          .catch((err) => {
            if (!settled) {
              settled = true;
              reject(err);
            }
          });
      })
  );
}

function req<T>(call: () => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const r = call();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error('IndexedDB request failed'));
  });
}

export function generateClientTempId(): string {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  // Best-effort fallback — enough entropy to avoid collision within one shop.
  return `otmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueSale(entry: {
  clientTempId?: string;
  shopId: string;
  payload: QueuedSalePayload;
}): Promise<QueuedSale> {
  const clientTempId = entry.clientTempId || generateClientTempId();
  const record: QueuedSale = {
    clientTempId,
    shopId: entry.shopId,
    payload: entry.payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  await tx('readwrite', (store) => req(() => store.put(record)));
  return record;
}

export async function listQueuedSales(): Promise<QueuedSale[]> {
  try {
    const all = await tx<QueuedSale[]>('readonly', (store) => req(() => store.getAll()));
    return (all || []).sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function countQueuedSales(): Promise<number> {
  try {
    return await tx<number>('readonly', (store) => req(() => store.count()));
  } catch {
    return 0;
  }
}

export async function removeQueuedSale(clientTempId: string): Promise<void> {
  await tx('readwrite', (store) => req(() => store.delete(clientTempId)));
}

export async function markAttempt(
  clientTempId: string,
  error?: string,
): Promise<void> {
  await tx('readwrite', (store) =>
    new Promise<void>((resolve, reject) => {
      const getReq = store.get(clientTempId);
      getReq.onsuccess = () => {
        const existing = getReq.result as QueuedSale | undefined;
        if (!existing) {
          resolve();
          return;
        }
        const updated: QueuedSale = {
          ...existing,
          attempts: (existing.attempts || 0) + 1,
          lastError: error,
          lastAttemptAt: Date.now(),
        };
        const putReq = store.put(updated);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    })
  );
}

export async function clearQueue(): Promise<void> {
  await tx('readwrite', (store) => req(() => store.clear()));
}

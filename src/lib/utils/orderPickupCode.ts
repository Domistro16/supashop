const ORDER_PICKUP_PREFIX = 'SUPASHOP_ORDER';

export function buildOrderPickupCode(params: { saleId: string; orderId: string }) {
  return `${ORDER_PICKUP_PREFIX}|${params.saleId}|${params.orderId}`;
}

export function parseOrderPickupCode(raw: string) {
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith(`${ORDER_PICKUP_PREFIX}|`)) {
    const [, saleId, orderId] = value.split('|');
    return {
      saleId: saleId || null,
      orderId: orderId || null,
      raw: value,
    };
  }

  try {
    const url = new URL(value);
    const salesMatch = url.pathname.match(/\/sales\/([^/?#]+)/i);
    if (salesMatch) {
      return {
        saleId: decodeURIComponent(salesMatch[1]),
        orderId: null,
        raw: value,
      };
    }
  } catch {
    // Not a URL, fall through to raw value handling.
  }

  return {
    saleId: null,
    orderId: value,
    raw: value,
  };
}

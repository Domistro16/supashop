import { prisma } from '@/lib/prisma';

export interface LoyaltySettings {
  enabled: boolean;
  pointsPerNaira: number;
  nairaPerPoint: number;
  silverThreshold: number;
  goldThreshold: number;
  platinumThreshold: number;
}

export function tierForPoints(points: number, s: LoyaltySettings): string {
  if (points >= s.platinumThreshold) return 'platinum';
  if (points >= s.goldThreshold) return 'gold';
  if (points >= s.silverThreshold) return 'silver';
  return 'bronze';
}

export async function getLoyaltySettings(shopId: string): Promise<LoyaltySettings> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      loyaltyEnabled: true,
      loyaltyPointsPerNaira: true,
      loyaltyNairaPerPoint: true,
      loyaltySilverThreshold: true,
      loyaltyGoldThreshold: true,
      loyaltyPlatinumThreshold: true,
    },
  });
  if (!shop) {
    return {
      enabled: false,
      pointsPerNaira: 0.01,
      nairaPerPoint: 1,
      silverThreshold: 1000,
      goldThreshold: 5000,
      platinumThreshold: 10000,
    };
  }
  return {
    enabled: shop.loyaltyEnabled,
    pointsPerNaira: Number(shop.loyaltyPointsPerNaira),
    nairaPerPoint: Number(shop.loyaltyNairaPerPoint),
    silverThreshold: shop.loyaltySilverThreshold,
    goldThreshold: shop.loyaltyGoldThreshold,
    platinumThreshold: shop.loyaltyPlatinumThreshold,
  };
}

/**
 * Apply a sale to a customer's loyalty record: accrue points on spend and
 * deduct redeemed points, then recompute tier. All writes use the shared prisma
 * instance, so call this outside of a transaction.
 */
export async function applySaleToLoyalty(params: {
  customerId: string;
  shopId: string;
  totalAmount: number;
  pointsRedeemed?: number;
}): Promise<void> {
  const settings = await getLoyaltySettings(params.shopId);
  if (!settings.enabled) return;

  const customer = await prisma.customer.findUnique({
    where: { id: params.customerId },
    include: { loyaltyPoint: true },
  });
  if (!customer) return;

  const pointsToAdd = Math.floor(Number(params.totalAmount) * settings.pointsPerNaira);
  const pointsToSpend = Math.max(0, Math.floor(params.pointsRedeemed || 0));

  const currentPoints = customer.loyaltyPoint?.points ?? 0;
  const nextPoints = Math.max(0, currentPoints + pointsToAdd - pointsToSpend);
  const nextTier = tierForPoints(nextPoints, settings);

  if (customer.loyaltyPoint) {
    await prisma.loyaltyPoint.update({
      where: { customerId: params.customerId },
      data: { points: nextPoints, tier: nextTier },
    });
  } else {
    await prisma.loyaltyPoint.create({
      data: { customerId: params.customerId, points: nextPoints, tier: nextTier },
    });
  }
}

export async function adjustCustomerPoints(params: {
  customerId: string;
  shopId: string;
  delta: number;
}): Promise<{ points: number; tier: string }> {
  const settings = await getLoyaltySettings(params.shopId);
  const customer = await prisma.customer.findFirst({
    where: { id: params.customerId, shopId: params.shopId },
    include: { loyaltyPoint: true },
  });
  if (!customer) throw new Error('Customer not found');

  const currentPoints = customer.loyaltyPoint?.points ?? 0;
  const nextPoints = Math.max(0, currentPoints + Math.floor(params.delta));
  const nextTier = tierForPoints(nextPoints, settings);

  if (customer.loyaltyPoint) {
    await prisma.loyaltyPoint.update({
      where: { customerId: params.customerId },
      data: { points: nextPoints, tier: nextTier },
    });
  } else {
    await prisma.loyaltyPoint.create({
      data: { customerId: params.customerId, points: nextPoints, tier: nextTier },
    });
  }
  return { points: nextPoints, tier: nextTier };
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { verifyAuth, getShopId } from '@server/middleware/auth';
import { adjustCustomerPoints } from '@server/services/loyalty';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const shopId = getShopId(request);
    if (!shopId) {
      return NextResponse.json({ error: 'Shop context required' }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();
    const delta = Number(body.delta);
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!Number.isFinite(delta) || delta === 0) {
      return NextResponse.json({ error: 'Invalid adjustment amount' }, { status: 400 });
    }

    const customer = await prisma.customer.findFirst({ where: { id, shopId } });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const result = await adjustCustomerPoints({ customerId: id, shopId, delta });

    await prisma.activityLog.create({
      data: {
        shopId,
        staffId: authResult.user.id,
        action: 'loyalty_adjust',
        details: {
          customerId: id,
          delta,
          reason,
          newPoints: result.points,
          newTier: result.tier,
        },
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Loyalty adjust error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to adjust loyalty points' },
      { status: 500 }
    );
  }
}

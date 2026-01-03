import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, getShopId } from '@server/middleware/auth';
import { generateBusinessSummary } from '@server/services/ai.service';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const shopId = getShopId(request);
    if (!shopId) {
      return NextResponse.json({ error: 'Shop context required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as 'daily' | 'monthly') || 'daily';

    if (!['daily', 'monthly'].includes(period)) {
      return NextResponse.json({ error: 'Period must be "daily" or "monthly"' }, { status: 400 });
    }

    const summary = await generateBusinessSummary(shopId, period);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Business summary error:', error);
    return NextResponse.json({
      error: 'Failed to generate business summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

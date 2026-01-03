import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, getShopId } from '@server/middleware/auth';
import { generateSalesPredictions } from '@server/services/ai.service';

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

    const predictions = await generateSalesPredictions(shopId);
    return NextResponse.json(predictions);
  } catch (error) {
    console.error('Sales predictions error:', error);
    return NextResponse.json({
      error: 'Failed to generate sales predictions',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

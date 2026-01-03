import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, getShopId } from '@/lib/middleware/auth';
import { generateRestockingSuggestions } from '@/lib/services/ai.service';

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

    const suggestions = await generateRestockingSuggestions(shopId);
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Restocking suggestions error:', error);
    return NextResponse.json({
      error: 'Failed to generate restocking suggestions',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

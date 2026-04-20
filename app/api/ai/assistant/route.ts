import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@server/middleware/auth';
import { askShopAssistant } from '@server/services/shopAssistant.service';

export async function POST(request: NextRequest) {
    try {
        const auth = await verifyAuth(request);
        if (!auth.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const { shopId, question, history } = body;

        if (!shopId || typeof shopId !== 'string') {
            return NextResponse.json({ error: 'shopId required' }, { status: 400 });
        }
        if (!question || typeof question !== 'string' || question.trim().length < 3) {
            return NextResponse.json({ error: 'question required' }, { status: 400 });
        }
        if (question.length > 1000) {
            return NextResponse.json({ error: 'question too long (max 1000 chars)' }, { status: 400 });
        }

        const result = await askShopAssistant(shopId, question.trim(), history);
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        console.error('Shop assistant error:', error);
        return NextResponse.json(
            {
                error: 'Failed to answer question',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

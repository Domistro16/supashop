/**
 * Marketing Message API Endpoint
 * POST /api/shops/:shopId/marketing-message
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@server/middleware/auth';
import { generateMarketingMessage } from '@server/services/aiMarketingService';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ shopId: string }> }
) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (!authResult.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { shopId } = await params;
        if (!shopId) {
            return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
        }

        // Generate marketing message
        const marketing = await generateMarketingMessage(shopId);

        return NextResponse.json({
            success: true,
            data: marketing,
        });
    } catch (error) {
        console.error('Marketing message error:', error);
        return NextResponse.json({
            error: 'Failed to generate marketing message',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

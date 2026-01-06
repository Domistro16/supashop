/**
 * Daily Briefing API Endpoint
 * POST /api/shops/:shopId/briefing
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@server/middleware/auth';
import { generateDailyBriefing } from '@server/services/dailyBriefingService';

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

        // Generate daily briefing
        const briefing = await generateDailyBriefing(shopId);

        return NextResponse.json({
            success: true,
            data: briefing,
        });
    } catch (error) {
        console.error('Daily briefing error:', error);
        return NextResponse.json({
            error: 'Failed to generate daily briefing',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

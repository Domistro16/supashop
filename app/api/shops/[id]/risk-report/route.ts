/**
 * Risk Report API Endpoint
 * GET /api/shops/:shopId/risk-report
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@server/middleware/auth';
import { generateRiskReport } from '@server/services/aiRiskService';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Verify authentication
        const authResult = await verifyAuth(request);
        if (!authResult.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
        }

        // Generate risk report
        const riskReport = await generateRiskReport(id);

        return NextResponse.json({
            success: true,
            data: riskReport,
        });
    } catch (error) {
        console.error('Risk report error:', error);
        return NextResponse.json({
            error: 'Failed to generate risk report',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

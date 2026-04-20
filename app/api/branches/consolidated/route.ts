import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, getShopId } from '@server/middleware/auth';
import { getConsolidatedReport, getRootShopId } from '@server/services/branch.service';

export async function GET(request: NextRequest) {
    try {
        const auth = await verifyAuth(request);
        if (!auth.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const shopId = getShopId(request);
        if (!shopId) return NextResponse.json({ error: 'x-shop-id header required' }, { status: 400 });

        const root = await getRootShopId(shopId);
        const report = await getConsolidatedReport(root);
        return NextResponse.json({ success: true, rootShopId: root, ...report });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to build report' }, { status: 500 });
    }
}

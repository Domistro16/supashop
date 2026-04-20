import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, getShopId } from '@server/middleware/auth';
import { createStockTransfer, listTransfersForShop } from '@server/services/branch.service';

export async function GET(request: NextRequest) {
    try {
        const auth = await verifyAuth(request);
        if (!auth.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const shopId = getShopId(request);
        if (!shopId) return NextResponse.json({ error: 'x-shop-id header required' }, { status: 400 });

        const transfers = await listTransfersForShop(shopId);
        return NextResponse.json({ success: true, transfers });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await verifyAuth(request);
        if (!auth.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const shopId = getShopId(request);
        if (!shopId) return NextResponse.json({ error: 'x-shop-id header required' }, { status: 400 });

        const { toShopId, items, notes } = await request.json();
        if (!toShopId || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'toShopId and items required' }, { status: 400 });
        }

        const transferId = await createStockTransfer({
            fromShopId: shopId,
            toShopId,
            items,
            notes,
            createdByUserId: auth.user.id,
        });
        return NextResponse.json({ success: true, transferId });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to create transfer' }, { status: 400 });
    }
}

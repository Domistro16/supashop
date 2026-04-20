import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@server/middleware/auth';
import { syncPricesFromHQ } from '@server/services/branch.service';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await verifyAuth(request);
        if (!auth.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        if (body.action === 'sync-prices') {
            const result = await syncPricesFromHQ(id);
            return NextResponse.json({ success: true, ...result });
        }
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
    }
}

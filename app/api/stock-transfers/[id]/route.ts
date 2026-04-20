import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@server/middleware/auth';
import { completeStockTransfer, cancelStockTransfer } from '@server/services/branch.service';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await verifyAuth(request);
        if (!auth.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;
        const { action } = await request.json().catch(() => ({}));
        if (action === 'complete') {
            await completeStockTransfer(id);
            return NextResponse.json({ success: true });
        }
        if (action === 'cancel') {
            await cancelStockTransfer(id);
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: 'action must be "complete" or "cancel"' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed' }, { status: 400 });
    }
}

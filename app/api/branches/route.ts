import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, getShopId } from '@server/middleware/auth';
import { createBranch, getBranches, getRootShopId } from '@server/services/branch.service';

export async function GET(request: NextRequest) {
    try {
        const auth = await verifyAuth(request);
        if (!auth.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const shopId = getShopId(request);
        if (!shopId) return NextResponse.json({ error: 'x-shop-id header required' }, { status: 400 });

        const root = await getRootShopId(shopId);
        const branches = await getBranches(root);
        return NextResponse.json({ success: true, rootShopId: root, branches });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to list branches' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await verifyAuth(request);
        if (!auth.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const shopId = getShopId(request);
        if (!shopId) return NextResponse.json({ error: 'x-shop-id header required' }, { status: 400 });

        const { name, branchLabel, address } = await request.json();
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return NextResponse.json({ error: 'Branch name required' }, { status: 400 });
        }

        const root = await getRootShopId(shopId);
        const result = await createBranch({
            parentShopId: root,
            name: name.trim(),
            branchLabel: branchLabel?.trim(),
            address: address?.trim(),
            ownerId: auth.user.id,
        });
        return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to create branch' }, { status: 500 });
    }
}

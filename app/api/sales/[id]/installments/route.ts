import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { verifyAuth, getShopId } from '@server/middleware/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await verifyAuth(request);
        if (!authResult.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const shopId = getShopId(request);
        if (!shopId) {
            return NextResponse.json({ error: 'Shop context required' }, { status: 400 });
        }

        const { id } = await params;

        // Verify sale belongs to shop
        // We search by ID or orderId similar to getSale
        const sale = await prisma.sale.findFirst({
            where: {
                shopId,
                OR: [
                    { id },
                    { orderId: id }
                ]
            },
        });

        if (!sale) {
            return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
        }

        const installments = await prisma.installment.findMany({
            where: { saleId: sale.id },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(installments);
    } catch (error) {
        console.error('Get installments error:', error);
        return NextResponse.json({ error: 'Failed to fetch installments' }, { status: 500 });
    }
}

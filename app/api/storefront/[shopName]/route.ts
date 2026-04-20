import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
    params: Promise<{ shopName: string }>;
}

function getStorefrontShopWhere(shopName: string) {
    return {
        OR: [
            { name: { equals: shopName, mode: 'insensitive' as const } },
            { name: { equals: shopName.replace(/-/g, ' '), mode: 'insensitive' as const } }
        ]
    };
}

export async function GET(_: Request, { params }: RouteParams) {
    try {
        const { shopName } = await params;

        const shop = await prisma.shop.findFirst({
            where: getStorefrontShopWhere(shopName),
            select: {
                id: true,
                name: true,
                transferBankName: true,
                transferAccountName: true,
                transferAccountNumber: true,
            }
        });

        if (!shop) {
            return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
        }

        const supportsBankTransfer = Boolean(
            shop.transferBankName &&
            shop.transferAccountName &&
            shop.transferAccountNumber
        );

        return NextResponse.json({
            ...shop,
            supportsBankTransfer,
        });
    } catch (error) {
        console.error('Storefront shop lookup error:', error);
        return NextResponse.json({ error: 'Failed to load storefront shop' }, { status: 500 });
    }
}

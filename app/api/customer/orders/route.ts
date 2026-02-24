import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const token = authHeader.split(' ')[1];
        const shopName = req.nextUrl.searchParams.get('shopName');

        // Verify token
        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'customer-secret-key');
        } catch {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }

        // Find shop
        const shop = await prisma.shop.findFirst({
            where: {
                OR: [
                    { name: { equals: shopName as string, mode: 'insensitive' } },
                    { name: { equals: (shopName as string).replace(/-/g, ' '), mode: 'insensitive' } }
                ]
            }
        });

        if (!shop) {
            return NextResponse.json(
                { error: 'Shop not found' },
                { status: 404 }
            );
        }

        // Fetch customer's orders for this shop
        const orders = await prisma.sale.findMany({
            where: {
                customerId: decoded.customerId,
                shopId: shop.id,
                isOnlineOrder: true,
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                orderId: true,
                totalAmount: true,
                orderStatus: true,
                createdAt: true,
                saleItems: {
                    select: {
                        quantity: true,
                        product: { select: { name: true } }
                    }
                }
            }
        });

        return NextResponse.json({ orders });

    } catch (error) {
        console.error('Customer orders error:', error);
        return NextResponse.json(
            { error: 'Failed to get orders' },
            { status: 500 }
        );
    }
}

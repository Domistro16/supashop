import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function GET(req: Request) {
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

        // Fetch customer
        const customer = await prisma.customer.findUnique({
            where: { id: decoded.customerId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                shopId: true,
            }
        });

        if (!customer) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ customer });

    } catch (error) {
        console.error('Customer me error:', error);
        return NextResponse.json(
            { error: 'Failed to get customer info' },
            { status: 500 }
        );
    }
}

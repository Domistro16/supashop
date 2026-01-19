import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const verifyToken = async (req: NextRequest) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
        return decoded.userId;
    } catch {
        return null;
    }
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await verifyToken(req);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await req.json();
        const { isFeatured } = body;

        // Verify product belongs to user's shop (simplified check for now, ideally check via Shop)
        const product = await prisma.product.findUnique({
            where: { id },
            include: { shop: true }
        });

        if (!product || product.shop.ownerId !== userId) {
            return NextResponse.json({ error: 'Product not found or unauthorized' }, { status: 404 });
        }

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: { isFeatured }
        });

        return NextResponse.json({ product: updatedProduct });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
}

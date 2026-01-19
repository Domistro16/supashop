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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const userId = await verifyToken(req);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const shop = await prisma.shop.findFirst({
        where: { id, ownerId: userId }
    });

    if (!shop) {
        return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    return NextResponse.json(shop);
}

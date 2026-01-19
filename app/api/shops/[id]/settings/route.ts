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

    // Verify ownership
    const shop = await prisma.shop.findFirst({
        where: { id, ownerId: userId }
    });

    if (!shop) {
        return NextResponse.json({ error: 'Shop not found or unauthorized' }, { status: 404 });
    }

    try {
        const body = await req.json();
        const { heroTitle, heroSubtitle, primaryColor } = body;

        const updatedShop = await prisma.shop.update({
            where: { id },
            data: {
                heroTitle,
                heroSubtitle,
                primaryColor,
                isStorefrontEnabled: body.isStorefrontEnabled,
            }
        });

        return NextResponse.json({ shop: updatedShop });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update shop settings' }, { status: 500 });
    }
}

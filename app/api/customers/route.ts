import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, getShopId } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const shopId = getShopId(request);
    if (!shopId) {
      return NextResponse.json({ error: 'Shop context required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const where: any = {
      shopId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tag) {
      where.tags = { has: tag };
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        loyaltyPoint: true,
        _count: {
          select: { sales: true },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const shopId = getShopId(request);
    if (!shopId) {
      return NextResponse.json({ error: 'Shop context required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, phone, address, notes, tags } = body;

    if (!name) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    // Check for duplicate phone or email
    if (phone || email) {
      const existing = await prisma.customer.findFirst({
        where: {
          shopId,
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(email ? [{ email }] : []),
          ],
        },
      });

      if (existing) {
        return NextResponse.json({
          error: 'Customer with this phone or email already exists',
        }, { status: 400 });
      }
    }

    const customer = await prisma.customer.create({
      data: {
        shopId,
        name,
        email,
        phone,
        address,
        notes,
        tags: tags || [],
      },
      include: {
        loyaltyPoint: true,
      },
    });

    // Create loyalty points entry
    await prisma.loyaltyPoint.create({
      data: {
        customerId: customer.id,
        points: 0,
        tier: 'bronze',
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}

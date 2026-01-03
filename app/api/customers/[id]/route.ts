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

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        loyaltyPoint: true,
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            saleItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    stock: true,
                    categoryName: true,
                    supplierId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!customer || customer.shopId !== shopId) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Get customer error:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

export async function PUT(
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
    const body = await request.json();
    const { name, email, phone, address, notes, tags } = body;

    const existing = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existing || existing.shopId !== shopId) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Check for duplicate phone or email (excluding current customer)
    if (phone || email) {
      const duplicate = await prisma.customer.findFirst({
        where: {
          shopId,
          id: { not: id },
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(email ? [{ email }] : []),
          ],
        },
      });

      if (duplicate) {
        return NextResponse.json({
          error: 'Another customer with this phone or email already exists',
        }, { status: 400 });
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address,
        notes,
        tags,
      },
      include: {
        loyaltyPoint: true,
      },
    });

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(
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

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer || customer.shopId !== shopId) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}

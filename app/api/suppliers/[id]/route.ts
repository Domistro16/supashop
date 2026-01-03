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

    const supplier = await prisma.supplier.findFirst({
      where: {
        id,
        shopId,
      },
      include: {
        products: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error('Get supplier error:', error);
    return NextResponse.json({ error: 'Failed to fetch supplier' }, { status: 500 });
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
    const { name, contactPerson, email, phone, address, notes } = body;

    // Check if supplier exists and belongs to shop
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        id,
        shopId,
      },
    });

    if (!existingSupplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Check for duplicate name (excluding current supplier)
    if (name && name !== existingSupplier.name) {
      const duplicateSupplier = await prisma.supplier.findFirst({
        where: {
          shopId,
          name: {
            equals: name,
            mode: 'insensitive',
          },
          NOT: { id },
        },
      });

      if (duplicateSupplier) {
        return NextResponse.json({ error: 'Supplier with this name already exists' }, { status: 400 });
      }
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: name || existingSupplier.name,
        contactPerson: contactPerson !== undefined ? contactPerson : existingSupplier.contactPerson,
        email: email !== undefined ? email : existingSupplier.email,
        phone: phone !== undefined ? phone : existingSupplier.phone,
        address: address !== undefined ? address : existingSupplier.address,
        notes: notes !== undefined ? notes : existingSupplier.notes,
      },
    });

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error('Update supplier error:', error);
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
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

    // Check if supplier exists and belongs to shop
    const supplier = await prisma.supplier.findFirst({
      where: {
        id,
        shopId,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Check if supplier has products
    if (supplier._count.products > 0) {
      return NextResponse.json({
        error: `Cannot delete supplier. ${supplier._count.products} product(s) are linked to this supplier. Please reassign or delete those products first.`,
      }, { status: 400 });
    }

    await prisma.supplier.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 });
  }
}

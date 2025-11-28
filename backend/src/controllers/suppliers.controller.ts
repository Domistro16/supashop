import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all suppliers for a shop
export async function getSuppliers(req: Request, res: Response) {
  try {
    const { search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const where: any = {
      shopId: req.shopId,
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { contactPerson: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: {
        [sortBy as string]: sortOrder,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    res.json({ suppliers });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
}

// Get a single supplier by ID
export async function getSupplierById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const supplier = await prisma.supplier.findFirst({
      where: {
        id,
        shopId: req.shopId,
      },
      include: {
        products: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Get last 10 products
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ supplier });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
}

// Create a new supplier
export async function createSupplier(req: Request, res: Response) {
  try {
    const { name, contactPerson, email, phone, address, notes } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    // Check for duplicate name in the same shop
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        shopId: req.shopId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existingSupplier) {
      return res.status(400).json({ error: 'Supplier with this name already exists' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        shopId: req.shopId!,
        name,
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        notes: notes || null,
      },
    });

    res.status(201).json({ supplier });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
}

// Update a supplier
export async function updateSupplier(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, contactPerson, email, phone, address, notes } = req.body;

    // Check if supplier exists and belongs to shop
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        id,
        shopId: req.shopId,
      },
    });

    if (!existingSupplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Check for duplicate name (excluding current supplier)
    if (name && name !== existingSupplier.name) {
      const duplicateSupplier = await prisma.supplier.findFirst({
        where: {
          shopId: req.shopId,
          name: {
            equals: name,
            mode: 'insensitive',
          },
          NOT: { id },
        },
      });

      if (duplicateSupplier) {
        return res.status(400).json({ error: 'Supplier with this name already exists' });
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

    res.json({ supplier });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
}

// Delete a supplier
export async function deleteSupplier(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check if supplier exists and belongs to shop
    const supplier = await prisma.supplier.findFirst({
      where: {
        id,
        shopId: req.shopId,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Check if supplier has products
    if (supplier._count.products > 0) {
      return res.status(400).json({
        error: `Cannot delete supplier. ${supplier._count.products} product(s) are linked to this supplier. Please reassign or delete those products first.`,
      });
    }

    await prisma.supplier.delete({
      where: { id },
    });

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
}

// Get supplier statistics
export async function getSupplierStats(req: Request, res: Response) {
  try {
    const totalSuppliers = await prisma.supplier.count({
      where: { shopId: req.shopId },
    });

    const suppliers = await prisma.supplier.findMany({
      where: { shopId: req.shopId },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    const totalProducts = suppliers.reduce((sum, s) => sum + s._count.products, 0);
    const activeSuppliers = suppliers.filter(s => s._count.products > 0).length;

    // Get top suppliers by product count
    const topSuppliers = suppliers
      .sort((a, b) => b._count.products - a._count.products)
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        name: s.name,
        productCount: s._count.products,
        totalSpent: s.totalSpent,
      }));

    res.json({
      stats: {
        totalSuppliers,
        activeSuppliers,
        totalProducts,
        topSuppliers,
      },
    });
  } catch (error) {
    console.error('Get supplier stats error:', error);
    res.status(500).json({ error: 'Failed to fetch supplier statistics' });
  }
}

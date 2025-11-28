import { Response } from 'express';
import { AuthRequest } from '../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all customers for the current shop
 */
export async function getAllCustomers(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const search = req.query.search as string;
    const tag = req.query.tag as string;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    const where: any = {
      shopId: req.shopId,
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

    res.json({ customers });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
}

/**
 * Get a single customer by ID
 */
export async function getCustomerById(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const { id } = req.params;

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
                product: true,
              },
            },
          },
        },
      },
    });

    if (!customer || customer.shopId !== req.shopId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ customer });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
}

/**
 * Create a new customer
 */
export async function createCustomer(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const { name, email, phone, address, notes, tags } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    // Check for duplicate phone or email
    if (phone || email) {
      const existing = await prisma.customer.findFirst({
        where: {
          shopId: req.shopId,
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(email ? [{ email }] : []),
          ],
        },
      });

      if (existing) {
        return res.status(400).json({
          error: 'Customer with this phone or email already exists',
        });
      }
    }

    const customer = await prisma.customer.create({
      data: {
        shopId: req.shopId,
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

    res.status(201).json({ customer });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
}

/**
 * Update a customer
 */
export async function updateCustomer(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const { id } = req.params;
    const { name, email, phone, address, notes, tags } = req.body;

    const existing = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existing || existing.shopId !== req.shopId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check for duplicate phone or email (excluding current customer)
    if (phone || email) {
      const duplicate = await prisma.customer.findFirst({
        where: {
          shopId: req.shopId,
          id: { not: id },
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(email ? [{ email }] : []),
          ],
        },
      });

      if (duplicate) {
        return res.status(400).json({
          error: 'Another customer with this phone or email already exists',
        });
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

    res.json({ customer });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
}

/**
 * Delete a customer
 */
export async function deleteCustomer(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer || customer.shopId !== req.shopId) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await prisma.customer.delete({
      where: { id },
    });

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
}

/**
 * Get customer statistics for analytics
 */
export async function getCustomerStats(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const totalCustomers = await prisma.customer.count({
      where: { shopId: req.shopId },
    });

    const newCustomersThisMonth = await prisma.customer.count({
      where: {
        shopId: req.shopId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    const topCustomers = await prisma.customer.findMany({
      where: { shopId: req.shopId },
      orderBy: { totalSpent: 'desc' },
      take: 5,
      include: {
        loyaltyPoint: true,
      },
    });

    const avgCustomerValue = await prisma.customer.aggregate({
      where: { shopId: req.shopId },
      _avg: {
        totalSpent: true,
      },
    });

    const loyaltyTierDistribution = await prisma.loyaltyPoint.groupBy({
      by: ['tier'],
      where: {
        customer: {
          shopId: req.shopId,
        },
      },
      _count: {
        tier: true,
      },
    });

    res.json({
      totalCustomers,
      newCustomersThisMonth,
      topCustomers,
      avgCustomerValue: avgCustomerValue._avg.totalSpent || 0,
      loyaltyTierDistribution,
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({ error: 'Failed to fetch customer statistics' });
  }
}

/**
 * Update customer loyalty points (called internally when a sale is made)
 */
export async function updateCustomerFromSale(
  customerId: string,
  saleAmount: number
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { loyaltyPoint: true },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Update customer stats
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalSpent: { increment: saleAmount },
        visitCount: { increment: 1 },
        lastVisit: new Date(),
      },
    });

    // Update loyalty points (1 point per ₦100 spent)
    const pointsToAdd = Math.floor(saleAmount / 100);

    if (customer.loyaltyPoint) {
      const newPoints = customer.loyaltyPoint.points + pointsToAdd;

      // Determine tier based on points
      let tier = 'bronze';
      if (newPoints >= 10000) tier = 'platinum';
      else if (newPoints >= 5000) tier = 'gold';
      else if (newPoints >= 1000) tier = 'silver';

      await prisma.loyaltyPoint.update({
        where: { customerId },
        data: {
          points: newPoints,
          tier,
        },
      });
    }
  } catch (error) {
    console.error('Update customer from sale error:', error);
    throw error;
  }
}

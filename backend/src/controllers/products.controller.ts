import { Response } from 'express';
import { AuthRequest, CreateProductRequest, UpdateProductRequest } from '../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get all products for the current shop
 */
export async function getProducts(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const products = await prisma.product.findMany({
      where: { shopId: req.shopId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}

/**
 * Get a single product by ID
 */
export async function getProduct(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const product = await prisma.product.findFirst({
      where: {
        id,
        shopId: req.shopId,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
}

/**
 * Create a new product
 */
export async function createProduct(req: AuthRequest, res: Response) {
  try {
    const { name, stock, price, categoryName }: CreateProductRequest = req.body;

    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    if (!name || stock === undefined || price === undefined) {
      return res.status(400).json({ error: 'Name, stock, and price are required' });
    }

    const product = await prisma.product.create({
      data: {
        shopId: req.shopId,
        name,
        stock,
        price,
        categoryName,
      },
    });

    // Log activity
    if (req.user) {
      await prisma.activityLog.create({
        data: {
          shopId: req.shopId,
          staffId: req.user.id,
          action: 'add_product',
          details: {
            productId: product.id,
            productName: product.name,
          },
        },
      });
    }

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
}

/**
 * Update a product
 */
export async function updateProduct(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const updates: UpdateProductRequest = req.body;

    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    // Check if product exists and belongs to shop
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        shopId: req.shopId,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await prisma.product.update({
      where: { id },
      data: updates,
    });

    // Log activity
    if (req.user) {
      await prisma.activityLog.create({
        data: {
          shopId: req.shopId,
          staffId: req.user.id,
          action: 'update_product',
          details: {
            productId: product.id,
            productName: product.name,
            updates,
          },
        },
      });
    }

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    // Check if product exists and belongs to shop
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        shopId: req.shopId,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await prisma.product.delete({
      where: { id },
    });

    // Log activity
    if (req.user) {
      await prisma.activityLog.create({
        data: {
          shopId: req.shopId,
          staffId: req.user.id,
          action: 'delete_product',
          details: {
            productId: id,
            productName: existingProduct.name,
          },
        },
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
}

/**
 * Get unique categories for the current shop
 */
export async function getCategories(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const products = await prisma.product.findMany({
      where: {
        shopId: req.shopId,
        categoryName: { not: null },
      },
      select: { categoryName: true },
      distinct: ['categoryName'],
    });

    const categories = products.map((p) => p.categoryName).filter(Boolean);

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}


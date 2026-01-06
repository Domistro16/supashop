import { Response } from 'express';
import { AuthRequest, CreateProductRequest, UpdateProductRequest } from '../types';
import { prisma } from '@server/prisma';
import { createNotification } from './notifications.controller';



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
    const { name, stock, price, costPrice, categoryName, supplierId }: CreateProductRequest = req.body;

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
        costPrice: costPrice !== undefined ? costPrice : null,
        categoryName,
        supplierId: supplierId || null,
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

      // Create notification for product addition
      await createNotification(
        req.shopId,
        req.user.id,
        'product_alert',
        'New Product Added',
        `${name} has been added to inventory.`,
        { productId: product.id }
      );

      // Check for low stock and create notification if needed
      if (product.stock <= 10) {
        await createNotification(
          req.shopId,
          req.user.id,
          'low_stock',
          'Low Stock Alert',
          `Product "${product.name}" is running low on stock. Current quantity: ${product.stock} units.`,
          {
            productId: product.id,
            productName: product.name,
            stock: product.stock,
          }
        );
      }
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
    const { name, stock, price, costPrice, categoryName, supplierId }: UpdateProductRequest = req.body;

    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    // Check if product exists
    const existingProduct = await prisma.product.findFirst({
      where: { id, shopId: req.shopId },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (stock !== undefined) updateData.stock = stock;
    if (price !== undefined) updateData.price = price;
    if (costPrice !== undefined) updateData.costPrice = costPrice;
    if (categoryName !== undefined) updateData.categoryName = categoryName;
    if (supplierId !== undefined) updateData.supplierId = supplierId;

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    // Log activity
    if (req.user) {
      await prisma.activityLog.create({
        data: {
          shopId: req.shopId!,
          staffId: req.user.id,
          action: 'update_product',
          details: {
            productId: product.id,
            productName: product.name,
            changes: Object.keys(updateData),
          },
        },
      });

      // Check for low stock after update and create notification if needed
      if ((stock !== undefined && stock <= 10) || product.stock <= 10) {
        await createNotification(
          req.shopId!,
          req.user.id,
          'low_stock',
          'Low Stock Alert',
          `Product "${product.name}" is running low on stock. Current quantity: ${product.stock} units.`,
          {
            productId: product.id,
            productName: product.name,
            stock: product.stock,
          }
        );
      }
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


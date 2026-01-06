/**
 * Legacy Supabase Client Compatibility Layer
 *
 * This file provides backward compatibility for components still using
 * the old Supabase client. It wraps the new API client.
 *
 * DEPRECATED: New components should import from '@/lib/api' instead.
 */

import api from './lib/api';

// Legacy types (kept for compatibility)
type Product = {
  id: string;
  name: string;
  stock: number;
  price: string;
  created_at: string;
  category: string;
};

type Transaction = {
  id: string;
  order_id: string;
  total_amount: string;
  created_at: string;
  staff_id: string;
  profit?: number;
  customer?: {
    id: string;
    name: string;
  } | null;
};

type Item = {
  product: string;
  quantity: number;
  unitCost: number;
  discountPercent?: number;
};

// ... other types if any

// ... types ...

export const getProducts = async (): Promise<Product[]> => {
  try {
    const products = await api.products.getAll();
    return products.map((item: any) => ({
      id: item.id,
      name: item.name,
      stock: item.stock,
      price: item.price.toString(),
      costPrice: item.costPrice?.toString(),
      created_at: item.createdAt,
      category: item.categoryName || '',
    }));
  } catch (error) {
    console.error('Failed to get products:', error);
    return [];
  }
};

export const getShop = async () => {
  try {
    return await api.shops.getCurrent();
  } catch (error) {
    console.error('Failed to get shop:', error);
    return null;
  }
};

export const getSales = async (): Promise<Transaction[]> => {
  try {
    const sales = await api.sales.getAll();

    const transactions: Transaction[] = [];
    for (const item of sales) {
      const staffName = item.staff?.name || 'Unknown';

      // Calculate profit
      let totalCost = 0;
      if (item.saleItems) {
        totalCost = item.saleItems.reduce((acc: number, saleItem: any) => {
          const cost = Number(saleItem.product?.costPrice || 0);
          return acc + (saleItem.quantity * cost);
        }, 0);
      }

      const revenue = Number(item.totalAmount);
      // Only calculate profit if we have cost data (totalCost > 0 or explicit 0 cost)
      // If totalCost is 0, it might mean no cost data, so profit = revenue (100% margin) or 0? 
      // For now, assume 0 cost if not provided.
      const profit = revenue - totalCost;

      transactions.push({
        id: item.id,
        order_id: item.orderId,
        total_amount: item.totalAmount.toString(),
        created_at: item.createdAt,
        staff_id: staffName,
        profit,
        customer: item.customer || null,
      });
    }

    return transactions;
  } catch (error) {
    console.error('Failed to get sales:', error);
    return [];
  }
};

export const getSale = async (id: string): Promise<Transaction | null> => {
  try {
    const sale = await api.sales.getById(id);
    if (!sale) return null;

    // Calculate profit
    let totalCost = 0;
    if (sale.saleItems) {
      totalCost = sale.saleItems.reduce((acc: number, saleItem: any) => {
        const cost = Number(saleItem.product?.costPrice || 0);
        return acc + (saleItem.quantity * cost);
      }, 0);
    }

    return {
      id: sale.id,
      order_id: sale.orderId,
      total_amount: sale.totalAmount.toString(),
      created_at: sale.createdAt,
      staff_id: sale.staff?.name || 'Unknown',
      profit: Number(sale.totalAmount) - totalCost,
      customer: sale.customer || null,
    };
  } catch (error) {
    console.log('Failed to fetch individual sale', error);
    return null;
  }
};

export const getSaleItems = async (sale_id: string): Promise<Item[]> => {
  try {
    const saleItems = await api.sales.getItems(sale_id);

    const items: Item[] = saleItems.map((item: any) => ({
      product: item.product?.name || 'Unknown',
      quantity: Number(item.quantity),
      unitCost: Number(item.price),
      discountPercent: Number(item.discountPercent ?? 0),
    }));

    return items;
  } catch (error) {
    console.error('Failed to get sale items:', error);
    return [];
  }
};

export async function getRecentItems() {
  try {
    const recentItems = await api.sales.getRecentItems(10);

    const items = [];
    for (const item of recentItems) {
      if (!item.product) continue;
      const product = item.product as any; // Cast to access potential categoryName not in type definition yet
      items.push({
        id: item.id,
        name: product.name,
        category: product.categoryName || product.category || '',
        variants: `${item.quantity} Variants`,
        price: Number(item.price),
      });
    }

    return items;
  } catch (error) {
    console.error('Failed to get recent items:', error);
    return [];
  }
}

export const addProduct = async (
  name: string,
  category: string,
  stock: number,
  price: number,
  costPrice?: number,
  supplierId?: string
) => {
  try {
    const product = await api.products.create({
      name,
      categoryName: category,
      stock,
      price,
      costPrice,
      supplierId: supplierId || undefined,
    } as any);

    return { success: true, data: product };
  } catch (error: any) {
    console.error('Failed to add product:', error);
    return { success: false, error: error.message };
  }
};

export async function getProfiles() {
  try {
    const [profiles, shop] = await Promise.all([
      api.staff.getAll(),
      api.shops.getCurrent(),
    ]);

    // Find current user profile
    const userProf = profiles.find((p: any) => p.id === api.shops.getCurrentShopId());

    return {
      profiles,
      userProf: userProf || (profiles.length > 0 ? profiles[0] : null)
    };
  } catch (error) {
    console.error('Failed to get profiles:', error);
    return { profiles: [], userProf: null };
  }
}

export const record_sale = async (items: Item[], customerId?: string): Promise<boolean> => {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      console.error('Invalid items array');
      return false;
    }

    // Calculate total with discounts
    let totalAmount = 0;
    const saleItems = items.map(item => {
      const subtotal = item.unitCost * item.quantity;
      const discountPercent = item.discountPercent ?? 0;
      const discountAmount = (subtotal * discountPercent) / 100;
      const itemTotal = subtotal - discountAmount;
      totalAmount += itemTotal;

      return {
        productId: item.product,
        quantity: item.quantity,
        price: item.unitCost,
        discountPercent: discountPercent,
      };
    });

    // Create sale with optional customer
    await api.sales.create({
      items: saleItems,
      totalAmount,
      customerId,
    } as any);

    console.log('Sale recorded successfully');
    return true;
  } catch (error) {
    console.error('Failed to record sale:', error);
    return false;
  }
};

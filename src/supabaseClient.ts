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
};

type Item = {
  product: string;
  quantity: number;
  unitCost: number;
  discountPercent?: number; // Optional discount percentage
};

// Legacy Supabase client (for components that still reference it)
// Note: This is a dummy object to prevent errors. New code should use api.auth.*
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async () => ({ data: null, error: new Error('Use api.auth.signIn instead') }),
    signUp: async () => ({ data: null, error: new Error('Use api.auth.signUp instead') }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: () => ({
    select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
    insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
    update: () => ({ eq: async () => ({ data: null, error: null }) }),
  }),
  rpc: async () => ({ data: null, error: null }),
  functions: {
    invoke: async () => ({ data: null, error: new Error('Use api endpoints instead') }),
  },
};

// Wrapper functions that use the new API
export const getCategories = async () => {
  try {
    const categories = await api.products.getCategories();
    return new Response(JSON.stringify({ categories }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};



export const getProducts = async (): Promise<Product[]> => {
  try {
    const products = await api.products.getAll();
    return products.map((item: any) => ({
      id: item.id,
      name: item.name,
      stock: item.stock,
      price: item.price.toString(),
      created_at: item.createdAt,
      category: item.categoryName || '',

    }));
  } catch (error) {
    console.error('Failed to get products:', error);
    return [];
  }
};

export const getStaff = async (id: string): Promise<string | undefined> => {
  try {
    const staff = await api.staff.getById(id);
    return staff.name;
  } catch (error) {
    console.error('Failed to get staff:', error);
    return undefined;
  }
};

export const getProduct = async (id: string) => {
  try {
    const product = await api.products.getById(id);
    return {
      name: product.name,
      category_name: product.categoryName,
      ...product,
    };
  } catch (error) {
    console.error('Failed to get product:', error);
    return null;
  }
};

export const getShop = async () => {
  try {
    const shop = await api.shops.getCurrent();
    return shop;
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
      transactions.push({
        id: item.id,
        order_id: item.orderId,
        total_amount: item.totalAmount.toString(),
        created_at: item.createdAt,
        staff_id: staffName,
        customer: item.customer || null,
      });
    }

    return transactions;
  } catch (error) {
    console.error('Failed to get sales:', error);
    return [];
  }
};

export const getSaleItems = async (sale_id: string): Promise<Item[]> => {
  try {
    const saleItems = await api.sales.getItems(sale_id);

    const items: Item[] = saleItems.map((item: any) => ({
      product: item.product?.name || 'Unknown',
      quantity: Number(item.quantity),
      unitCost: Number(item.price),
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
      items.push({
        id: item.id,
        name: item.product.name,
        category: item.product.categoryName || '',
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
  supplierId?: string
) => {
  try {
    const product = await api.products.create({
      name,
      categoryName: category,
      stock,
      price,
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

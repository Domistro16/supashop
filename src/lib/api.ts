/**
 * API Client for SupaShop Backend
 * Replaces Supabase client with REST API calls
 */

const API_BASE_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/api'
  : 'http://localhost:3000/api';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Shop {
  id: string;
  name: string;
  address?: string | null;
  target?: number;
  role: string;
  permissions: string[];
  joinedAt?: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
  shops: Shop[];
}

export interface Product {
  id: string;
  name: string;
  stock: number;
  price: string | number;
  categoryName?: string;
  supplierId?: string | null;
  supplier?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  orderId: string;
  totalAmount: string | number;
  createdAt: string;
  staff?: {
    id: string;
    name: string;
    email: string;
  };
  customer?: {
    id: string;
    name: string;
    phone?: string;
  } | null;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  price: string | number;
  product?: {
    id: string;
    name: string;
  };
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
  joinedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: Permission[];
  staffCount?: number;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  category: string;
}

// Storage for auth token and current shop
let authToken: string | null = null;
let currentShopId: string | null = null;

// Initialize from localStorage if available (client-side only)
if (typeof window !== 'undefined') {
  authToken = localStorage.getItem('auth_token');
  currentShopId = localStorage.getItem('current_shop_id');
}

// Helper function to get headers
function getHeaders(includeShopId = false): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (includeShopId && currentShopId) {
    headers['x-shop-id'] = currentShopId;
  }

  return headers;
}

// Helper function for API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  includeShopId = false
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = getHeaders(includeShopId);

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ============================================
// Authentication API
// ============================================

export const auth = {
  signUp: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    shopName: string;
    shopAddress?: string;
  }): Promise<AuthResponse> => {
    const response = await apiCall<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Store token and shop ID
    authToken = response.token;
    localStorage.setItem('auth_token', response.token);

    if (response.shops.length > 0) {
      currentShopId = response.shops[0].id;
      localStorage.setItem('current_shop_id', response.shops[0].id);
    }

    return response;
  },

  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiCall<AuthResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store token
    authToken = response.token;
    localStorage.setItem('auth_token', response.token);

    // Store first shop as default
    if (response.shops.length > 0) {
      const savedShopId = localStorage.getItem('current_shop_id');
      const shopExists = response.shops.find(s => s.id === savedShopId);

      if (!shopExists) {
        currentShopId = response.shops[0].id;
        localStorage.setItem('current_shop_id', response.shops[0].id);
      } else {
        currentShopId = savedShopId;
      }
    }

    return response;
  },

  signOut: async (): Promise<void> => {
    authToken = null;
    currentShopId = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_shop_id');
  },

  getUser: async (): Promise<{ user: User; shops: Shop[] }> => {
    return apiCall('/auth/me');
  },

  updateProfile: async (data: { name: string }): Promise<{ user: User }> => {
    return apiCall('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> => {
    return apiCall('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },
};

// ============================================
// Shop API
// ============================================

export const shops = {
  getMyShops: async (): Promise<Shop[]> => {
    return apiCall('/shops/my-shops');
  },

  getCurrent: async (): Promise<Shop> => {
    return apiCall('/shops', {}, true);
  },

  update: async (data: { name?: string; address?: string; target?: number }): Promise<Shop> => {
    return apiCall('/shops', {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },

  setCurrentShop: (shopId: string): void => {
    currentShopId = shopId;
    localStorage.setItem('current_shop_id', shopId);
  },

  getCurrentShopId: (): string | null => {
    return currentShopId;
  },
};

// ============================================
// Products API
// ============================================

export const products = {
  getAll: async (): Promise<Product[]> => {
    return apiCall('/products', {}, true);
  },

  getById: async (id: string): Promise<Product> => {
    return apiCall(`/products/${id}`, {}, true);
  },

  create: async (data: {
    name: string;
    stock: number;
    price: number;
    categoryName?: string;

  }): Promise<Product> => {
    return apiCall('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },

  update: async (id: string, data: {
    name?: string;
    stock?: number;
    price?: number;
    categoryName?: string;

  }): Promise<Product> => {
    return apiCall(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },

  delete: async (id: string): Promise<void> => {
    return apiCall(`/products/${id}`, {
      method: 'DELETE',
    }, true);
  },

  getCategories: async (): Promise<string[]> => {
    return apiCall('/products/categories', {}, true);
  },


};

// ============================================
// Sales API
// ============================================

export const sales = {
  getAll: async (): Promise<Sale[]> => {
    return apiCall('/sales', {}, true);
  },

  getById: async (id: string): Promise<Sale & { saleItems: SaleItem[] }> => {
    return apiCall(`/sales/${id}`, {}, true);
  },

  create: async (data: {
    items: Array<{ productId: string; quantity: number; price: number }>;
    totalAmount: number;
  }): Promise<Sale> => {
    return apiCall('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },

  getItems: async (saleId: string): Promise<SaleItem[]> => {
    return apiCall(`/sales/${saleId}/items`, {}, true);
  },

  getRecentItems: async (limit = 10): Promise<SaleItem[]> => {
    return apiCall(`/sales/recent-items?limit=${limit}`, {}, true);
  },
};

// ============================================
// Staff API
// ============================================

export const staff = {
  getAll: async (): Promise<Staff[]> => {
    return apiCall('/staff', {}, true);
  },

  getById: async (id: string): Promise<Staff> => {
    return apiCall(`/staff/${id}`, {}, true);
  },

  getInvites: async (): Promise<{
    id: string;
    name: string;
    email: string;
    role: string;
    accepted: boolean;
  }[]> => {
    return apiCall('/staff/invites', {}, true);
  },

  invite: async (data: { email: string; roleId: string }): Promise<{
    message: string;
    user: User;
    tempPassword: string | null;
    isNewUser: boolean;
  }> => {
    return apiCall('/staff/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },

  updateRole: async (id: string, roleId: string): Promise<{ message: string }> => {
    return apiCall(`/staff/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ roleId }),
    }, true);
  },

  remove: async (id: string): Promise<{ message: string }> => {
    return apiCall(`/staff/${id}`, {
      method: 'DELETE',
    }, true);
  },
};

// ============================================
// Roles & Permissions API
// ============================================

export const roles = {
  getAll: async (): Promise<Role[]> => {
    return apiCall('/roles', {}, true);
  },

  getPermissions: async (): Promise<{ all: Permission[]; byCategory: Record<string, Permission[]> }> => {
    return apiCall('/roles/permissions', {}, true);
  },

  create: async (data: {
    name: string;
    description?: string;
    permissionIds: string[];
  }): Promise<Role> => {
    return apiCall('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },

  update: async (id: string, data: {
    name?: string;
    description?: string;
    permissionIds?: string[];
  }): Promise<Role> => {
    return apiCall(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },

  delete: async (id: string): Promise<void> => {
    return apiCall(`/roles/${id}`, {
      method: 'DELETE',
    }, true);
  },
};

// Export current shop and permissions helpers
export const permissions = {
  check: (permission: string): boolean => {
    if (typeof window === 'undefined') return false;
    const shops = JSON.parse(localStorage.getItem('user_shops') || '[]') as Shop[];
    const currentShop = shops.find(s => s.id === currentShopId);
    return currentShop?.permissions?.includes(permission) || false;
  },

  checkAny: (permissionsList: string[]): boolean => {
    if (typeof window === 'undefined') return false;
    const shops = JSON.parse(localStorage.getItem('user_shops') || '[]') as Shop[];
    const currentShop = shops.find(s => s.id === currentShopId);
    return permissionsList.some(p => currentShop?.permissions?.includes(p)) || false;
  },

  getCurrentPermissions: (): string[] => {
    if (typeof window === 'undefined') return [];
    const shops = JSON.parse(localStorage.getItem('user_shops') || '[]') as Shop[];
    const currentShop = shops.find(s => s.id === currentShopId);
    return currentShop?.permissions || [];
  },

  isOwner: (): boolean => {
    if (typeof window === 'undefined') return false;
    const shops = JSON.parse(localStorage.getItem('user_shops') || '[]') as Shop[];
    const currentShop = shops.find(s => s.id === currentShopId);
    return currentShop?.role === 'owner';
  },
};

// ============================================
// AI API
// ============================================

export interface AIPredictions {
  predictions: string;
  trends: string;
  recommendations: string[];
}

export interface AIBusinessSummary {
  summary: string;
  highlights: string[];
  insights: string;
}

export interface AIRestockingSuggestions {
  urgentRestocks: Array<{
    productName: string;
    currentStock: number;
    reason: string;
  }>;
  recommendations: string[];
  insights: string;
}

export const ai = {
  getSalesPredictions: async (): Promise<AIPredictions> => {
    return apiCall('/ai/predictions', {}, true);
  },

  getBusinessSummary: async (period: 'daily' | 'monthly' = 'daily'): Promise<AIBusinessSummary> => {
    return apiCall(`/ai/summary?period=${period}`, {}, true);
  },

  getRestockingSuggestions: async (): Promise<AIRestockingSuggestions> => {
    return apiCall('/ai/restocking', {}, true);
  },
};

// ============================================
// Notifications API
// ============================================

export interface Notification {
  id: string;
  shopId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export const notifications = {
  getAll: async (limit = 20, unreadOnly = false): Promise<NotificationsResponse> => {
    return apiCall(`/notifications?limit=${limit}&unreadOnly=${unreadOnly}`, {}, true);
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    return apiCall(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    }, true);
  },

  markAllAsRead: async (): Promise<void> => {
    return apiCall('/notifications/read-all', {
      method: 'PUT',
      body: JSON.stringify({ all: true }),
    }, true);
  },

  delete: async (notificationId: string): Promise<void> => {
    return apiCall(`/notifications/${notificationId}`, {
      method: 'DELETE',
    }, true);
  },
};

// ============================================
// Customers API
// ============================================

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  totalSpent: number;
  visitCount: number;
  lastVisit?: string | null;
  notes?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  loyaltyPoint?: LoyaltyPoint;
  _count?: {
    sales: number;
  };
}

export interface LoyaltyPoint {
  id: string;
  customerId: string;
  points: number;
  tier: string;
  updatedAt: string;
}

export interface CustomerStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  topCustomers: Customer[];
  avgCustomerValue: number;
  loyaltyTierDistribution: Array<{
    tier: string;
    _count: {
      tier: number;
    };
  }>;
}

export const customers = {
  getAll: async (params?: {
    search?: string;
    tag?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ customers: Customer[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.tag) queryParams.append('tag', params.tag);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const query = queryParams.toString();
    return apiCall(`/customers${query ? `?${query}` : ''}`, {}, true);
  },

  getById: async (id: string): Promise<{ customer: Customer }> => {
    return apiCall(`/customers/${id}`, {}, true);
  },

  create: async (data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    tags?: string[];
  }): Promise<{ customer: Customer }> => {
    return apiCall('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },

  update: async (id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
    tags?: string[];
  }): Promise<{ customer: Customer }> => {
    return apiCall(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiCall(`/customers/${id}`, {
      method: 'DELETE',
    }, true);
  },

  getStats: async (): Promise<CustomerStats> => {
    return apiCall('/customers/stats', {}, true);
  },
};

// ============================================
// Suppliers API
// ============================================

export interface Supplier {
  id: string;
  shopId: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrder?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
}

export interface SupplierStats {
  totalSuppliers: number;
  activeSuppliers: number;
  totalProducts: number;
  topSuppliers: Array<{
    id: string;
    name: string;
    productCount: number;
    totalSpent: number;
  }>;
}

export const suppliers = {
  getAll: async (params?: {
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ suppliers: Supplier[] }> => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const query = queryParams.toString();
    return apiCall(`/suppliers${query ? `?${query}` : ''}`, {}, true);
  },

  getById: async (id: string): Promise<{ supplier: Supplier }> => {
    return apiCall(`/suppliers/${id}`, {}, true);
  },

  create: async (data: {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }): Promise<{ supplier: Supplier }> => {
    return apiCall('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },

  update: async (id: string, data: {
    name?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }): Promise<{ supplier: Supplier }> => {
    return apiCall(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, true);
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiCall(`/suppliers/${id}`, {
      method: 'DELETE',
    }, true);
  },

  getStats: async (): Promise<SupplierStats> => {
    return apiCall('/suppliers/stats', {}, true);
  },
};

export const api = {
  auth,
  shops,
  products,
  sales,
  staff,
  roles,
  permissions,
  ai,
  notifications,
  customers,
  suppliers,
};

export default api;

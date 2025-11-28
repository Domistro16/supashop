import { Request } from 'express';

// Extend Express Request to include authenticated user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
  shopId?: string; // Current shop context
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

// Auth DTOs
export interface SignUpRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  shopName: string;
  shopAddress?: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  token: string;
  shops: {
    id: string;
    name: string;
    role: string;
    permissions: string[];
  }[];
}

// Product DTOs
export interface CreateProductRequest {
  name: string;
  stock: number;
  price: number;
  categoryName?: string;
}

export interface UpdateProductRequest {
  name?: string;
  stock?: number;
  price?: number;
  categoryName?: string;
  [key: string]: any;
}

// Sale DTOs
export interface SaleItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface CreateSaleRequest {
  items: SaleItem[];
  totalAmount: number;
}

// Staff DTOs
export interface InviteStaffRequest {
  email: string;
  roleId: string;
}

export interface UpdateStaffRoleRequest {
  roleId: string;
}

// Role DTOs
export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissionIds: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

// Permission check result
export interface PermissionCheck {
  hasPermission: boolean;
  permissions: string[];
}

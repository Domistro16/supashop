/**
 * Centralized Permission Checker
 * 
 * Defines a permission matrix mapping roles to allowed actions.
 * Provides a can() function to check if a user with a given role can perform an action.
 */

export type Role = 'owner' | 'manager' | 'cashier' | 'viewer' | 'clerk';

export interface User {
  id: string;
  email: string;
  name: string;
  role?: Role; // Role name for the current shop context
  isOwner?: boolean; // Whether user is the shop owner
}

/**
 * Permission matrix: Maps roles to allowed actions
 * Actions follow the pattern: resource:action (e.g., 'products:delete', 'shop:update')
 */
const PERMISSION_MATRIX: Record<Role, string[]> = {
  owner: [
    // Products - full access
    'products:read',
    'products:create',
    'products:update',
    'products:delete',
    // Sales - full access
    'sales:read',
    'sales:create',
    'sales:update',
    'sales:delete',
    // Staff - full access
    'staff:read',
    'staff:create',
    'staff:update',
    'staff:delete',
    'staff:manage_roles',
    // Shop - full access
    'shop:read',
    'shop:update',
    'shop:delete',
    // Roles - full access
    'roles:read',
    'roles:create',
    'roles:update',
    'roles:delete',
    // Finance - full access
    'finance:read',
    'finance:update',
    'finance:payout',
    // Analytics
    'analytics:read',
  ],
  manager: [
    // Products - full access
    'products:read',
    'products:create',
    'products:update',
    'products:delete',
    // Sales - full access
    'sales:read',
    'sales:create',
    'sales:update',
    'sales:delete',
    // Staff - manage but not delete
    'staff:read',
    'staff:create',
    'staff:update',
    // Shop - read and update only
    'shop:read',
    'shop:update',
    // Roles - read only
    'roles:read',
    // Finance - read and update, but no payout
    'finance:read',
    'finance:update',
    // Analytics
    'analytics:read',
  ],
  cashier: [
    // Products - read only
    'products:read',
    // Sales - full access
    'sales:read',
    'sales:create',
    'sales:update',
    'sales:delete',
    // Analytics
    'analytics:read',
  ],
  viewer: [
    // Products - read only
    'products:read',
    // Sales - read only
    'sales:read',
    // Analytics - read only
    'analytics:read',
  ],
  clerk: [
    // Products - full access
    'products:read',
    'products:create',
    'products:update',
    'products:delete',
    // Sales - read only
    'sales:read',
  ],
};

/**
 * Check if a user can perform an action
 * 
 * @param user - User object with role information
 * @param action - Action to check (e.g., 'products:delete', 'shop:update')
 * @param resource - Optional resource object for resource-level checks (e.g., shop object for shop:delete)
 * @returns true if user can perform the action, false otherwise
 */
export function can(user: User, action: string, resource?: any): boolean {
  // If user is not provided, deny access
  if (!user) {
    return false;
  }

  // Owner-only actions that require explicit owner status check
  const OWNER_ONLY_ACTIONS = ['shop:delete', 'roles:delete', 'finance:payout'];
  
  // Check if this is an owner-only action
  const isOwnerOnlyAction = OWNER_ONLY_ACTIONS.includes(action);
  
  // Owner always has access (check isOwner flag or role === 'owner')
  const isOwner = user.isOwner === true || user.role === 'owner';
  
  if (isOwner) {
    // For owners, check if the action exists in the owner permission matrix
    // This ensures owners only have access to valid actions
    const ownerActions = PERMISSION_MATRIX['owner'];
    if (!ownerActions || !ownerActions.includes(action)) {
      return false; // Invalid action, even for owners
    }
    // Owner has access to all valid actions in the matrix
    return true;
  }

  // For non-owners, check owner-only actions first (security check)
  if (isOwnerOnlyAction) {
    // Only owners can perform these actions, regardless of resource presence
    return false;
  }

  // Get user's role
  const role = user.role;
  if (!role) {
    return false;
  }

  // Check if role exists in matrix
  const allowedActions = PERMISSION_MATRIX[role];
  if (!allowedActions) {
    return false;
  }

  // Check if action is in allowed actions
  const hasPermission = allowedActions.includes(action);

  return hasPermission;
}

/**
 * Get all allowed actions for a role
 * 
 * @param role - Role name
 * @returns Array of allowed actions
 */
export function getAllowedActions(role: Role): string[] {
  return PERMISSION_MATRIX[role] || [];
}

/**
 * Check if a role exists
 * 
 * @param role - Role name to check
 * @returns true if role exists, false otherwise
 */
export function isValidRole(role: string): role is Role {
  return role in PERMISSION_MATRIX;
}


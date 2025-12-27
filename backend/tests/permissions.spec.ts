import { can, getAllowedActions, isValidRole, Role, User } from '../src/lib/permissions';

describe('Permission System', () => {
  describe('can() function', () => {
    describe('Owner permissions', () => {
      const ownerUser: User = {
        id: 'user-1',
        email: 'owner@example.com',
        name: 'Owner',
        role: 'owner',
        isOwner: true,
      };

      it('should allow owner to perform all product actions', () => {
        expect(can(ownerUser, 'products:read')).toBe(true);
        expect(can(ownerUser, 'products:create')).toBe(true);
        expect(can(ownerUser, 'products:update')).toBe(true);
        expect(can(ownerUser, 'products:delete')).toBe(true);
      });

      it('should allow owner to perform all sales actions', () => {
        expect(can(ownerUser, 'sales:read')).toBe(true);
        expect(can(ownerUser, 'sales:create')).toBe(true);
        expect(can(ownerUser, 'sales:update')).toBe(true);
        expect(can(ownerUser, 'sales:delete')).toBe(true);
      });

      it('should allow owner to perform all staff actions', () => {
        expect(can(ownerUser, 'staff:read')).toBe(true);
        expect(can(ownerUser, 'staff:create')).toBe(true);
        expect(can(ownerUser, 'staff:update')).toBe(true);
        expect(can(ownerUser, 'staff:delete')).toBe(true);
        expect(can(ownerUser, 'staff:manage_roles')).toBe(true);
      });

      it('should allow owner to delete shops', () => {
        const shopResource = { id: 'shop-1' };
        expect(can(ownerUser, 'shop:delete', shopResource)).toBe(true);
      });

      it('should allow owner to perform finance actions', () => {
        expect(can(ownerUser, 'finance:read')).toBe(true);
        expect(can(ownerUser, 'finance:update')).toBe(true);
        const financeResource = { id: 'finance-1' };
        expect(can(ownerUser, 'finance:payout', financeResource)).toBe(true);
      });

      it('should allow owner to perform all role actions', () => {
        expect(can(ownerUser, 'roles:read')).toBe(true);
        expect(can(ownerUser, 'roles:create')).toBe(true);
        expect(can(ownerUser, 'roles:update')).toBe(true);
        const roleResource = { id: 'role-1' };
        expect(can(ownerUser, 'roles:delete', roleResource)).toBe(true);
      });
    });

    describe('Manager permissions', () => {
      const managerUser: User = {
        id: 'user-2',
        email: 'manager@example.com',
        name: 'Manager',
        role: 'manager',
        isOwner: false,
      };

      it('should allow manager to perform all product actions', () => {
        expect(can(managerUser, 'products:read')).toBe(true);
        expect(can(managerUser, 'products:create')).toBe(true);
        expect(can(managerUser, 'products:update')).toBe(true);
        expect(can(managerUser, 'products:delete')).toBe(true);
      });

      it('should allow manager to perform all sales actions', () => {
        expect(can(managerUser, 'sales:read')).toBe(true);
        expect(can(managerUser, 'sales:create')).toBe(true);
        expect(can(managerUser, 'sales:update')).toBe(true);
        expect(can(managerUser, 'sales:delete')).toBe(true);
      });

      it('should allow manager to manage staff but not delete', () => {
        expect(can(managerUser, 'staff:read')).toBe(true);
        expect(can(managerUser, 'staff:create')).toBe(true);
        expect(can(managerUser, 'staff:update')).toBe(true);
        expect(can(managerUser, 'staff:delete')).toBe(false);
        expect(can(managerUser, 'staff:manage_roles')).toBe(false);
      });

      it('should allow manager to read and update shop but not delete', () => {
        expect(can(managerUser, 'shop:read')).toBe(true);
        expect(can(managerUser, 'shop:update')).toBe(true);
        const shopResource = { id: 'shop-1' };
        expect(can(managerUser, 'shop:delete', shopResource)).toBe(false);
      });

      it('should allow manager to read and update finance but not payout', () => {
        expect(can(managerUser, 'finance:read')).toBe(true);
        expect(can(managerUser, 'finance:update')).toBe(true);
        const financeResource = { id: 'finance-1' };
        expect(can(managerUser, 'finance:payout', financeResource)).toBe(false);
      });

      it('should allow manager to read roles but not create/update/delete', () => {
        expect(can(managerUser, 'roles:read')).toBe(true);
        expect(can(managerUser, 'roles:create')).toBe(false);
        expect(can(managerUser, 'roles:update')).toBe(false);
        const roleResource = { id: 'role-1' };
        expect(can(managerUser, 'roles:delete', roleResource)).toBe(false);
      });
    });

    describe('Cashier permissions', () => {
      const cashierUser: User = {
        id: 'user-3',
        email: 'cashier@example.com',
        name: 'Cashier',
        role: 'cashier',
        isOwner: false,
      };

      it('should allow cashier to read products only', () => {
        expect(can(cashierUser, 'products:read')).toBe(true);
        expect(can(cashierUser, 'products:create')).toBe(false);
        expect(can(cashierUser, 'products:update')).toBe(false);
        expect(can(cashierUser, 'products:delete')).toBe(false);
      });

      it('should allow cashier to perform all sales actions', () => {
        expect(can(cashierUser, 'sales:read')).toBe(true);
        expect(can(cashierUser, 'sales:create')).toBe(true);
        expect(can(cashierUser, 'sales:update')).toBe(true);
        expect(can(cashierUser, 'sales:delete')).toBe(true);
      });

      it('should not allow cashier to access staff endpoints', () => {
        expect(can(cashierUser, 'staff:read')).toBe(false);
        expect(can(cashierUser, 'staff:create')).toBe(false);
        expect(can(cashierUser, 'staff:update')).toBe(false);
        expect(can(cashierUser, 'staff:delete')).toBe(false);
        expect(can(cashierUser, 'staff:manage_roles')).toBe(false);
      });

      it('should not allow cashier to modify shop settings', () => {
        expect(can(cashierUser, 'shop:read')).toBe(false);
        expect(can(cashierUser, 'shop:update')).toBe(false);
        const shopResource = { id: 'shop-1' };
        expect(can(cashierUser, 'shop:delete', shopResource)).toBe(false);
      });

      it('should not allow cashier to access finance endpoints', () => {
        expect(can(cashierUser, 'finance:read')).toBe(false);
        expect(can(cashierUser, 'finance:update')).toBe(false);
        const financeResource = { id: 'finance-1' };
        expect(can(cashierUser, 'finance:payout', financeResource)).toBe(false);
      });
    });

    describe('Viewer permissions', () => {
      const viewerUser: User = {
        id: 'user-4',
        email: 'viewer@example.com',
        name: 'Viewer',
        role: 'viewer',
        isOwner: false,
      };

      it('should allow viewer to read products only', () => {
        expect(can(viewerUser, 'products:read')).toBe(true);
        expect(can(viewerUser, 'products:create')).toBe(false);
        expect(can(viewerUser, 'products:update')).toBe(false);
        expect(can(viewerUser, 'products:delete')).toBe(false);
      });

      it('should allow viewer to read sales only', () => {
        expect(can(viewerUser, 'sales:read')).toBe(true);
        expect(can(viewerUser, 'sales:create')).toBe(false);
        expect(can(viewerUser, 'sales:update')).toBe(false);
        expect(can(viewerUser, 'sales:delete')).toBe(false);
      });

      it('should not allow viewer to access staff endpoints', () => {
        expect(can(viewerUser, 'staff:read')).toBe(false);
        expect(can(viewerUser, 'staff:create')).toBe(false);
        expect(can(viewerUser, 'staff:update')).toBe(false);
        expect(can(viewerUser, 'staff:delete')).toBe(false);
      });

      it('should not allow viewer to modify shop settings', () => {
        expect(can(viewerUser, 'shop:read')).toBe(false);
        expect(can(viewerUser, 'shop:update')).toBe(false);
        const shopResource = { id: 'shop-1' };
        expect(can(viewerUser, 'shop:delete', shopResource)).toBe(false);
      });
    });

    describe('Clerk permissions', () => {
      const clerkUser: User = {
        id: 'user-5',
        email: 'clerk@example.com',
        name: 'Clerk',
        role: 'clerk',
        isOwner: false,
      };

      it('should allow clerk to perform all product actions', () => {
        expect(can(clerkUser, 'products:read')).toBe(true);
        expect(can(clerkUser, 'products:create')).toBe(true);
        expect(can(clerkUser, 'products:update')).toBe(true);
        expect(can(clerkUser, 'products:delete')).toBe(true);
      });

      it('should allow clerk to read sales only', () => {
        expect(can(clerkUser, 'sales:read')).toBe(true);
        expect(can(clerkUser, 'sales:create')).toBe(false);
        expect(can(clerkUser, 'sales:update')).toBe(false);
        expect(can(clerkUser, 'sales:delete')).toBe(false);
      });
    });

    describe('Resource-level checks', () => {
      it('should only allow owner to delete shops', () => {
        const ownerUser: User = {
          id: 'user-1',
          email: 'owner@example.com',
          name: 'Owner',
          role: 'owner',
          isOwner: true,
        };

        const managerUser: User = {
          id: 'user-2',
          email: 'manager@example.com',
          name: 'Manager',
          role: 'manager',
          isOwner: false,
        };

        const shopResource = { id: 'shop-1' };

        expect(can(ownerUser, 'shop:delete', shopResource)).toBe(true);
        expect(can(managerUser, 'shop:delete', shopResource)).toBe(false);
      });

      it('should only allow owner to delete roles', () => {
        const ownerUser: User = {
          id: 'user-1',
          email: 'owner@example.com',
          name: 'Owner',
          role: 'owner',
          isOwner: true,
        };

        const managerUser: User = {
          id: 'user-2',
          email: 'manager@example.com',
          name: 'Manager',
          role: 'manager',
          isOwner: false,
        };

        const roleResource = { id: 'role-1' };

        expect(can(ownerUser, 'roles:delete', roleResource)).toBe(true);
        expect(can(managerUser, 'roles:delete', roleResource)).toBe(false);
      });

      it('should only allow owner to perform finance payouts', () => {
        const ownerUser: User = {
          id: 'user-1',
          email: 'owner@example.com',
          name: 'Owner',
          role: 'owner',
          isOwner: true,
        };

        const managerUser: User = {
          id: 'user-2',
          email: 'manager@example.com',
          name: 'Manager',
          role: 'manager',
          isOwner: false,
        };

        const financeResource = { id: 'finance-1' };

        expect(can(ownerUser, 'finance:payout', financeResource)).toBe(true);
        expect(can(managerUser, 'finance:payout', financeResource)).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should deny access if user is null', () => {
        expect(can(null as any, 'products:read')).toBe(false);
      });

      it('should deny access if user has no role and is not owner', () => {
        const userWithoutRole: User = {
          id: 'user-1',
          email: 'user@example.com',
          name: 'User',
          isOwner: false,
        };

        expect(can(userWithoutRole, 'products:read')).toBe(false);
      });

      it('should deny access for invalid actions', () => {
        const ownerUser: User = {
          id: 'user-1',
          email: 'owner@example.com',
          name: 'Owner',
          role: 'owner',
          isOwner: true,
        };

        expect(can(ownerUser, 'invalid:action')).toBe(false);
      });
    });
  });

  describe('getAllowedActions() function', () => {
    it('should return all allowed actions for owner', () => {
      const actions = getAllowedActions('owner');
      expect(actions).toContain('products:read');
      expect(actions).toContain('products:delete');
      expect(actions).toContain('shop:delete');
      expect(actions.length).toBeGreaterThan(20);
    });

    it('should return allowed actions for manager', () => {
      const actions = getAllowedActions('manager');
      expect(actions).toContain('products:read');
      expect(actions).toContain('products:delete');
      expect(actions).not.toContain('shop:delete');
      expect(actions).not.toContain('roles:delete');
    });

    it('should return allowed actions for cashier', () => {
      const actions = getAllowedActions('cashier');
      expect(actions).toContain('products:read');
      expect(actions).toContain('sales:create');
      expect(actions).not.toContain('products:create');
      expect(actions).not.toContain('staff:read');
    });

    it('should return allowed actions for viewer', () => {
      const actions = getAllowedActions('viewer');
      expect(actions).toContain('products:read');
      expect(actions).toContain('sales:read');
      expect(actions).not.toContain('products:create');
      expect(actions).not.toContain('sales:create');
    });

    it('should return allowed actions for clerk', () => {
      const actions = getAllowedActions('clerk');
      expect(actions).toContain('products:read');
      expect(actions).toContain('products:create');
      expect(actions).toContain('sales:read');
      expect(actions).not.toContain('sales:create');
    });

    it('should return empty array for invalid role', () => {
      const actions = getAllowedActions('invalid' as Role);
      expect(actions).toEqual([]);
    });
  });

  describe('isValidRole() function', () => {
    it('should return true for valid roles', () => {
      expect(isValidRole('owner')).toBe(true);
      expect(isValidRole('manager')).toBe(true);
      expect(isValidRole('cashier')).toBe(true);
      expect(isValidRole('viewer')).toBe(true);
      expect(isValidRole('clerk')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(isValidRole('invalid')).toBe(false);
      expect(isValidRole('admin')).toBe(false);
      expect(isValidRole('')).toBe(false);
    });
  });
});


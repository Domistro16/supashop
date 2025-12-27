import { Router } from 'express';
import * as rolesController from '../controllers/roles.controller';
import { authenticate } from '../middleware/auth';
import ensureShopAccess from '../middleware/ensureShopAccess';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// All role routes require authentication and shop access
router.use(authenticate, ensureShopAccess);

// Permissions endpoint (read-only)
router.get('/permissions', requirePermission('roles:read'), rolesController.getPermissions);

// CRUD operations for roles
router.get('/', requirePermission('roles:read'), rolesController.getRoles);
router.post('/', requirePermission('roles:create'), rolesController.createRole);
router.put('/:id', requirePermission('roles:update'), rolesController.updateRole);
router.delete('/:id', requirePermission('roles:delete'), rolesController.deleteRole);

export default router;

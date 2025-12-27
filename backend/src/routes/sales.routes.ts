import { Router } from 'express';
import * as salesController from '../controllers/sales.controller';
import { authenticate } from '../middleware/auth';
import ensureShopAccess from '../middleware/ensureShopAccess';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// All sales routes require authentication and shop access
router.use(authenticate, ensureShopAccess);

// Get recent items
router.get('/recent-items', requirePermission('sales:read'), salesController.getRecentItems);

// Get sale items for a specific sale
router.get('/:saleId/items', requirePermission('sales:read'), salesController.getSaleItems);

// CRUD operations
router.get('/', requirePermission('sales:read'), salesController.getSales);
router.get('/:id', requirePermission('sales:read'), salesController.getSale);
router.post('/', requirePermission('sales:create'), salesController.createSale);

export default router;

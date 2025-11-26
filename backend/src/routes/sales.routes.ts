import { Router } from 'express';
import * as salesController from '../controllers/sales.controller';
import { authenticate, setShopContext } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// All sales routes require authentication and shop context
router.use(authenticate, setShopContext);

// Get recent items
router.get('/recent-items', requirePermission('sales:read'), salesController.getRecentItems);

// Get sale items for a specific sale
router.get('/:saleId/items', requirePermission('sales:read'), salesController.getSaleItems);

// CRUD operations
router.get('/', requirePermission('sales:read'), salesController.getSales);
router.get('/:id', requirePermission('sales:read'), salesController.getSale);
router.post('/', requirePermission('sales:create'), salesController.createSale);

export default router;

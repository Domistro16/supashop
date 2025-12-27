import { Router } from 'express';
import * as posController from '../controllers/pos.controller';
import { authenticate } from '../middleware/auth';
import ensureShopAccess from '../middleware/ensureShopAccess';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// All POS routes require authentication and shop access
router.use(authenticate, ensureShopAccess);

/**
 * POST /api/pos/sync
 * 
 * Sync offline sales to server.
 * Accepts array of offline sales with clientTempId.
 * Returns mapping of clientTempId -> serverId.
 * 
 * Idempotent: Same clientTempId returns existing mapping.
 */
router.post('/sync', requirePermission('sales:create'), posController.syncOfflineSales);

export default router;

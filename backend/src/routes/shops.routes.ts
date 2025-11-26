import { Router } from 'express';
import * as shopsController from '../controllers/shops.controller';
import { authenticate, setShopContext } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// Get all shops for the current user (no shop context needed)
router.get('/my-shops', authenticate, shopsController.getMyShops);

// Shop-specific routes (require shop context)
router.use(authenticate, setShopContext);

router.get('/', requirePermission('shop:read'), shopsController.getShop);
router.put('/', requirePermission('shop:update'), shopsController.updateShop);

export default router;

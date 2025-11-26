import { Router } from 'express';
import * as staffController from '../controllers/staff.controller';
import { authenticate, setShopContext } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// All staff routes require authentication and shop context
router.use(authenticate, setShopContext);

router.get('/', requirePermission('staff:read'), staffController.getStaff);
router.get('/:id', requirePermission('staff:read'), staffController.getStaffById);
router.post('/invite', requirePermission('staff:create'), staffController.inviteStaff);
router.put('/:id/role', requirePermission('staff:manage_roles'), staffController.updateStaffRole);
router.delete('/:id', requirePermission('staff:delete'), staffController.removeStaff);

export default router;

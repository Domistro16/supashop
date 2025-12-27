import { Router } from 'express';
import * as purchaseOrdersController from '../controllers/purchaseOrders.controller';
import { authenticate } from '../middleware/auth';
import ensureShopAccess from '../middleware/ensureShopAccess';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// All routes require authentication and shop access
router.use(authenticate, ensureShopAccess);

// List all purchase orders
router.get('/', requirePermission('products:read'), purchaseOrdersController.getPurchaseOrders);

// Get single purchase order
router.get('/:id', requirePermission('products:read'), purchaseOrdersController.getPurchaseOrder);

// Create new purchase order
router.post('/', requirePermission('products:create'), purchaseOrdersController.createPurchaseOrder);

// Update purchase order (draft only)
router.put('/:id', requirePermission('products:update'), purchaseOrdersController.updatePurchaseOrder);

// Send purchase order to supplier
router.post('/:id/send', requirePermission('products:update'), purchaseOrdersController.sendPurchaseOrder);

// Receive shipment (updates inventory)
router.post('/:id/receive', requirePermission('products:update'), purchaseOrdersController.receivePurchaseOrder);

// Cancel purchase order
router.post('/:id/cancel', requirePermission('products:update'), purchaseOrdersController.cancelPurchaseOrder);

export default router;

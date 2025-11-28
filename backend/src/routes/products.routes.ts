import { Router } from 'express';
import * as productsController from '../controllers/products.controller';
import { authenticate, setShopContext } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// All product routes require authentication and shop context
router.use(authenticate, setShopContext);

// Get unique categories
router.get('/categories', requirePermission('products:read'), productsController.getCategories);

// CRUD operations
router.get('/', requirePermission('products:read'), productsController.getProducts);
router.get('/:id', requirePermission('products:read'), productsController.getProduct);
router.post('/', requirePermission('products:create'), productsController.createProduct);
router.put('/:id', requirePermission('products:update'), productsController.updateProduct);
router.delete('/:id', requirePermission('products:delete'), productsController.deleteProduct);

export default router;

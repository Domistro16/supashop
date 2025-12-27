import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierStats,
} from '../controllers/suppliers.controller';
import { authenticate } from '../middleware/auth';
import ensureShopAccess from '../middleware/ensureShopAccess';

const router = Router();

// All routes require authentication and shop access
router.use(authenticate, ensureShopAccess);

// Supplier routes
router.get('/', getSuppliers);
router.get('/stats', getSupplierStats);
router.get('/:id', getSupplierById);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

export default router;

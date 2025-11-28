import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierStats,
} from '../controllers/suppliers.controller';
import { authenticate, setShopContext } from '../middleware/auth';

const router = Router();

// All routes require authentication and shop context
router.use(authenticate, setShopContext);

// Supplier routes
router.get('/', getSuppliers);
router.get('/stats', getSupplierStats);
router.get('/:id', getSupplierById);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

export default router;

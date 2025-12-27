import { Router } from 'express';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
} from '../controllers/customers.controller';
import { authenticate } from '../middleware/auth';
import ensureShopAccess from '../middleware/ensureShopAccess';

const router = Router();

// Apply authentication and shop access to all routes
router.use(authenticate, ensureShopAccess);

// Customer CRUD routes
router.get('/', getAllCustomers);
router.get('/stats', getCustomerStats);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;

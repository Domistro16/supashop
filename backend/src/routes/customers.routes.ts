import { Router } from 'express';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
} from '../controllers/customers.controller';
import { authenticate, setShopContext } from '../middleware/auth';

const router = Router();

// Apply authentication and shop context to all routes
router.use(authenticate, setShopContext);

// Customer CRUD routes
router.get('/', getAllCustomers);
router.get('/stats', getCustomerStats);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;

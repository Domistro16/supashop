import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import ensureShopAccess from '../middleware/ensureShopAccess';
import {
  getSalesPredictions,
  getBusinessSummary,
  getRestockingSuggestions,
} from '../controllers/ai.controller';

const router = Router();

// All AI routes require authentication and shop access
router.use(authenticate, ensureShopAccess);

/**
 * @route   GET /api/ai/predictions
 * @desc    Get AI-powered sales predictions and trends
 * @access  Private (requires shop context)
 */
router.get('/predictions', getSalesPredictions);

/**
 * @route   GET /api/ai/summary
 * @desc    Get AI business summary (daily or monthly)
 * @query   period - 'daily' or 'monthly' (default: 'daily')
 * @access  Private (requires shop context)
 */
router.get('/summary', getBusinessSummary);

/**
 * @route   GET /api/ai/restocking
 * @desc    Get AI inventory restocking suggestions
 * @access  Private (requires shop context)
 */
router.get('/restocking', getRestockingSuggestions);

export default router;

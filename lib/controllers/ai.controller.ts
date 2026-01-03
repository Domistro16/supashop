import { Response } from 'express';
import { AuthRequest } from '../types';
import {
  generateSalesPredictions,
  generateBusinessSummary,
  generateRestockingSuggestions,
} from '../services/ai.service';

/**
 * Get AI-powered sales predictions
 */
export async function getSalesPredictions(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const predictions = await generateSalesPredictions(req.shopId);
    res.json(predictions);
  } catch (error) {
    console.error('Sales predictions error:', error);
    res.status(500).json({
      error: 'Failed to generate sales predictions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get AI business summary (daily or monthly)
 */
export async function getBusinessSummary(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const period = (req.query.period as 'daily' | 'monthly') || 'daily';

    if (!['daily', 'monthly'].includes(period)) {
      return res.status(400).json({ error: 'Period must be "daily" or "monthly"' });
    }

    const summary = await generateBusinessSummary(req.shopId, period);
    res.json(summary);
  } catch (error) {
    console.error('Business summary error:', error);
    res.status(500).json({
      error: 'Failed to generate business summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get AI inventory restocking suggestions
 */
export async function getRestockingSuggestions(req: AuthRequest, res: Response) {
  try {
    if (!req.shopId) {
      return res.status(400).json({ error: 'Shop context required' });
    }

    const suggestions = await generateRestockingSuggestions(req.shopId);
    res.json(suggestions);
  } catch (error) {
    console.error('Restocking suggestions error:', error);
    res.status(500).json({
      error: 'Failed to generate restocking suggestions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * AI Service - Unified Insights
 * Combines predictions, summary, and restocking into a single LLM call for efficiency
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@server/prisma';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Simple in-memory cache to reduce API costs
interface CacheEntry {
  data: any;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttlMinutes: number): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMinutes * 60 * 1000,
  });
}

// ============================================
// UNIFIED INSIGHTS - Single LLM Call
// ============================================

interface UnifiedInsights {
  predictions: {
    predictions: string;
    trends: string;
    recommendations: string[];
  };
  summary: {
    summary: string;
    highlights: string[];
    insights: string;
  };
  restocking: {
    urgentRestocks: Array<{ productName: string; currentStock: number; reason: string }>;
    recommendations: string[];
    insights: string;
  };
}

/**
 * Generate all insights in a single LLM call to save tokens
 * This is the core unified function that other functions extract from
 */
async function generateUnifiedInsights(shopId: string): Promise<UnifiedInsights> {
  const cacheKey = `unified_insights_${shopId}_${new Date().toDateString()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Get date ranges
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Fetch all required data in parallel
  const [sales, products, activities] = await Promise.all([
    // Sales data (last 30 days)
    prisma.sale.findMany({
      where: { shopId, createdAt: { gte: thirtyDaysAgo } },
      include: {
        staff: { select: { name: true } },
        saleItems: { include: { product: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    // Products with sales history
    prisma.product.findMany({
      where: { shopId },
      include: {
        saleItems: {
          where: { sale: { createdAt: { gte: thirtyDaysAgo } } },
        },
      },
    }),
    // Recent activities
    prisma.activityLog.findMany({
      where: { shopId, createdAt: { gte: todayStart } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  // Calculate metrics for prompt
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const avgDailyRevenue = totalRevenue / 30;
  const salesByDay = sales.reduce((acc, sale) => {
    const day = sale.createdAt.toISOString().split('T')[0];
    acc[day] = (acc[day] || 0) + Number(sale.totalAmount);
    return acc;
  }, {} as Record<string, number>);

  // Product stats
  const productStats = products.map(p => {
    const totalSold = p.saleItems.reduce((sum, item) => sum + item.quantity, 0);
    const salesVelocity = totalSold / 30;
    const daysUntilStockout = salesVelocity > 0 ? p.stock / salesVelocity : 999;
    return {
      name: p.name,
      stock: p.stock,
      totalSold,
      salesVelocity: salesVelocity.toFixed(2),
      daysUntilStockout: Math.floor(daysUntilStockout),
    };
  });

  const lowStockProducts = productStats.filter(p => p.daysUntilStockout < 7);
  const todaySales = sales.filter(s => s.createdAt >= todayStart);
  const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const productsSold = todaySales.reduce((sum, s) => sum + s.saleItems.length, 0);

  // Activity counts
  const actionCounts = activities.reduce((acc, act) => {
    acc[act.action] = (acc[act.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Handle empty data case
  if (sales.length === 0 && products.length === 0) {
    const emptyResult: UnifiedInsights = {
      predictions: {
        predictions: 'Not enough data to make predictions. Start recording sales to get AI insights.',
        trends: 'N/A',
        recommendations: ['Record more sales to enable AI predictions'],
      },
      summary: {
        summary: 'No activity recorded today.',
        highlights: [],
        insights: 'Start recording sales and activities to get AI-powered insights.',
      },
      restocking: {
        urgentRestocks: [],
        recommendations: ['Add products to your inventory to get restocking suggestions'],
        insights: 'No products found in inventory.',
      },
    };
    setCache(cacheKey, emptyResult, 60);
    return emptyResult;
  }

  // Build unified prompt - ONE call for all three insights
  const prompt = `You are a business intelligence AI. Analyze this shop data and provide THREE types of insights in a SINGLE response:

=== SHOP DATA ===
Sales (Last 30 days):
- Total Sales: ${sales.length}
- Total Revenue: ₦${totalRevenue.toFixed(0)}
- Average Daily Revenue: ₦${avgDailyRevenue.toFixed(0)}
- Days with Sales: ${Object.keys(salesByDay).length}

Today's Performance:
- Sales Today: ${todaySales.length}
- Revenue Today: ₦${todayRevenue.toFixed(0)}
- Products Sold: ${productsSold}
- Activities: ${Object.entries(actionCounts).map(([k, v]) => `${k}: ${v}`).join(', ') || 'None'}

Inventory Status:
- Total Products: ${products.length}
- Low Stock Items: ${lowStockProducts.length}
- Top 5 Products: ${productStats.slice(0, 5).map(p => `${p.name}(Stock:${p.stock}, Sold:${p.totalSold})`).join(', ')}

=== REQUIRED OUTPUT (JSON) ===
{
  "predictions": {
    "predictions": "Brief prediction for next 7 days (1-2 sentences)",
    "trends": "Key trends observed (1 sentence)",
    "recommendations": ["action1", "action2", "action3"]
  },
  "summary": {
    "summary": "Executive summary of today's performance (2-3 sentences)",
    "highlights": ["highlight1", "highlight2", "highlight3"],
    "insights": "Key business insights (1-2 sentences)"
  },
  "restocking": {
    "urgentRestocks": [{"productName": "name", "currentStock": 0, "reason": "why urgent"}],
    "recommendations": ["restock recommendation 1", "restock recommendation 2"],
    "insights": "Overall inventory insight (1 sentence)"
  }
}

Keep responses concise. Max 250 words total.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and ensure structure
      const insights: UnifiedInsights = {
        predictions: {
          predictions: parsed.predictions?.predictions || 'Prediction unavailable',
          trends: parsed.predictions?.trends || 'Trend analysis unavailable',
          recommendations: parsed.predictions?.recommendations || ['Continue monitoring'],
        },
        summary: {
          summary: parsed.summary?.summary || 'Summary unavailable',
          highlights: parsed.summary?.highlights || [],
          insights: parsed.summary?.insights || 'Insights unavailable',
        },
        restocking: {
          urgentRestocks: parsed.restocking?.urgentRestocks || [],
          recommendations: parsed.restocking?.recommendations || [],
          insights: parsed.restocking?.insights || 'Inventory insights unavailable',
        },
      };

      // Cache for 2 hours
      setCache(cacheKey, insights, 120);
      return insights;
    }
  } catch (error) {
    console.error('LLM error in unified insights:', error);
  }

  // Fallback response
  const fallback: UnifiedInsights = {
    predictions: {
      predictions: `Based on ${sales.length} sales over 30 days, expect stable performance.`,
      trends: avgDailyRevenue > 0 ? `Average ₦${avgDailyRevenue.toFixed(0)}/day` : 'Building sales history',
      recommendations: ['Maintain current strategies', 'Monitor daily sales', 'Review inventory weekly'],
    },
    summary: {
      summary: `${todaySales.length} sales today generating ₦${todayRevenue.toFixed(0)}.`,
      highlights: [
        `${sales.length} total sales this month`,
        `${products.length} products in inventory`,
        `${lowStockProducts.length} items need restocking`,
      ],
      insights: 'Continue tracking to improve predictions.',
    },
    restocking: {
      urgentRestocks: lowStockProducts.slice(0, 5).map(p => ({
        productName: p.name,
        currentStock: p.stock,
        reason: `Only ${p.daysUntilStockout} days of stock remaining`,
      })),
      recommendations: ['Review low stock items', 'Check supplier lead times'],
      insights: `${lowStockProducts.length} products running low on stock.`,
    },
  };

  setCache(cacheKey, fallback, 60);
  return fallback;
}

// ============================================
// PUBLIC API - Extract from Unified Cache
// ============================================

/**
 * Generate AI-powered sales trend predictions
 * Extracts from unified insights to save tokens
 */
export async function generateSalesPredictions(shopId: string): Promise<{
  predictions: string;
  trends: string;
  recommendations: string[];
}> {
  const unified = await generateUnifiedInsights(shopId);
  return unified.predictions;
}

/**
 * Generate daily/monthly summary
 * Extracts from unified insights for daily, makes separate call for monthly
 */
export async function generateBusinessSummary(
  shopId: string,
  period: 'daily' | 'monthly'
): Promise<{
  summary: string;
  highlights: string[];
  insights: string;
}> {
  if (period === 'daily') {
    const unified = await generateUnifiedInsights(shopId);
    return unified.summary;
  }

  // Monthly still needs separate call due to different data scope
  const cacheKey = `summary_${shopId}_monthly_${new Date().toDateString()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const startDate = new Date();
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { shopId, createdAt: { gte: startDate } },
    include: {
      staff: { select: { name: true } },
      saleItems: { include: { product: { select: { name: true } } } },
    },
  });

  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const productsSold = sales.reduce((sum, sale) => sum + sale.saleItems.length, 0);

  if (sales.length === 0) {
    return {
      summary: 'No activity recorded this month.',
      highlights: [],
      insights: 'Start recording sales to get monthly insights.',
    };
  }

  const prompt = `Business intelligence AI: Create monthly summary.

Monthly Performance:
- Total Sales: ${sales.length}
- Revenue: ₦${totalRevenue.toFixed(0)}
- Products Sold: ${productsSold}

Provide JSON: {"summary":"2-3 sentence executive summary","highlights":["h1","h2","h3"],"insights":"key insight"}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      setCache(cacheKey, parsed, 1440); // 24 hours
      return parsed;
    }
  } catch (error) {
    console.error('Monthly summary error:', error);
  }

  const fallback = {
    summary: `This month: ${sales.length} sales totaling ₦${totalRevenue.toFixed(0)}.`,
    highlights: [`${sales.length} orders processed`, `${productsSold} items sold`],
    insights: 'Continue tracking for deeper insights.',
  };
  setCache(cacheKey, fallback, 1440);
  return fallback;
}

/**
 * Generate inventory restocking suggestions
 * Extracts from unified insights to save tokens
 */
export async function generateRestockingSuggestions(shopId: string): Promise<{
  urgentRestocks: Array<{ productName: string; currentStock: number; reason: string }>;
  recommendations: string[];
  insights: string;
}> {
  const unified = await generateUnifiedInsights(shopId);
  return unified.restocking;
}

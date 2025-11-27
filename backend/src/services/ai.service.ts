import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

/**
 * Generate AI-powered sales trend predictions
 */
export async function generateSalesPredictions(shopId: string): Promise<{
  predictions: string;
  trends: string;
  recommendations: string[];
}> {
  const cacheKey = `predictions_${shopId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Get last 30 days of sales data
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sales = await prisma.sale.findMany({
    where: {
      shopId,
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      totalAmount: true,
      createdAt: true,
    },
  });

  if (sales.length === 0) {
    return {
      predictions: 'Not enough data to make predictions. Start recording sales to get AI insights.',
      trends: 'N/A',
      recommendations: ['Record more sales to enable AI predictions'],
    };
  }

  // Prepare sales data summary
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const avgDailyRevenue = totalRevenue / 30;
  const salesByDay = sales.reduce((acc, sale) => {
    const day = sale.createdAt.toISOString().split('T')[0];
    acc[day] = (acc[day] || 0) + Number(sale.totalAmount);
    return acc;
  }, {} as Record<string, number>);

  const prompt = `You are a business analytics AI. Analyze this sales data and provide insights:

Sales Data (Last 30 days):
- Total Sales: ${sales.length}
- Total Revenue: ₦${totalRevenue.toFixed(2)}
- Average Daily Revenue: ₦${avgDailyRevenue.toFixed(2)}
- Days with Sales: ${Object.keys(salesByDay).length}

Provide a concise analysis (max 150 words) covering:
1. Key trends observed
2. Predicted sales for next 7 days (high/medium/low)
3. 3 specific actionable recommendations

Format as JSON:
{
  "predictions": "Brief prediction for next week",
  "trends": "Key trends observed",
  "recommendations": ["rec1", "rec2", "rec3"]
}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  // Parse JSON response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {
    predictions: 'Unable to generate predictions at this time.',
    trends: 'Insufficient data',
    recommendations: ['Continue recording sales'],
  };

  // Cache for 2 hours
  setCache(cacheKey, parsed, 120);
  return parsed;
}

/**
 * Generate daily/monthly summary
 */
export async function generateBusinessSummary(
  shopId: string,
  period: 'daily' | 'monthly'
): Promise<{
  summary: string;
  highlights: string[];
  insights: string;
}> {
  const cacheKey = `summary_${shopId}_${period}_${new Date().toDateString()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const startDate = new Date();

  if (period === 'daily') {
    startDate.setHours(0, 0, 0, 0);
  } else {
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
  }

  // Fetch sales data
  const sales = await prisma.sale.findMany({
    where: {
      shopId,
      createdAt: { gte: startDate },
    },
    include: {
      staff: { select: { name: true } },
      saleItems: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
  });

  // Fetch recent activity logs
  const activities = await prisma.activityLog.findMany({
    where: {
      shopId,
      createdAt: { gte: startDate },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  if (sales.length === 0 && activities.length === 0) {
    return {
      summary: `No activity recorded ${period === 'daily' ? 'today' : 'this month'}.`,
      highlights: [],
      insights: 'Start recording sales and activities to get AI-powered insights.',
    };
  }

  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
  const productsSold = sales.reduce((sum, sale) => sum + sale.saleItems.length, 0);

  // Count actions by type
  const actionCounts = activities.reduce((acc, act) => {
    acc[act.action] = (acc[act.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const prompt = `You are a business intelligence AI. Create a ${period} summary for a shop:

Performance Metrics:
- Total Sales: ${sales.length}
- Revenue: ₦${totalRevenue.toFixed(2)}
- Products Sold: ${productsSold}
- Activities: ${Object.entries(actionCounts).map(([k, v]) => `${k}: ${v}`).join(', ')}

Provide (max 200 words):
1. Executive summary
2. 3-4 key highlights
3. Business insights

Format as JSON:
{
  "summary": "Executive summary paragraph",
  "highlights": ["highlight1", "highlight2", "highlight3"],
  "insights": "Key insights paragraph"
}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {
    summary: 'Summary unavailable at this time.',
    highlights: [],
    insights: 'Continue recording activities for better insights.',
  };

  // Cache daily for 6 hours, monthly for 24 hours
  setCache(cacheKey, parsed, period === 'daily' ? 360 : 1440);
  return parsed;
}

/**
 * Generate inventory restocking suggestions
 */
export async function generateRestockingSuggestions(shopId: string): Promise<{
  urgentRestocks: Array<{ productName: string; currentStock: number; reason: string }>;
  recommendations: string[];
  insights: string;
}> {
  const cacheKey = `restock_${shopId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Get products with their sales history
  const products = await prisma.product.findMany({
    where: { shopId },
    include: {
      saleItems: {
        where: {
          sale: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        },
      },
    },
  });

  if (products.length === 0) {
    return {
      urgentRestocks: [],
      recommendations: ['Add products to your inventory to get restocking suggestions'],
      insights: 'No products found in inventory.',
    };
  }

  // Calculate sales velocity for each product
  const productStats = products.map(p => {
    const totalSold = p.saleItems.reduce((sum, item) => sum + item.quantity, 0);
    const salesVelocity = totalSold / 30; // Average daily sales
    const daysUntilStockout = salesVelocity > 0 ? p.stock / salesVelocity : 999;

    return {
      name: p.name,
      stock: p.stock,
      totalSold,
      salesVelocity: salesVelocity.toFixed(2),
      daysUntilStockout: Math.floor(daysUntilStockout),
      price: Number(p.price),
    };
  });

  const lowStockProducts = productStats.filter(p => p.daysUntilStockout < 7);

  const prompt = `You are an inventory management AI. Analyze this product data:

Products Analyzed: ${products.length}
Low Stock Items: ${lowStockProducts.length}

Top 5 Products by Sales:
${productStats.slice(0, 5).map(p =>
  `- ${p.name}: Stock=${p.stock}, Sold=${p.totalSold}, Velocity=${p.salesVelocity}/day, Days Until Stockout=${p.daysUntilStockout}`
).join('\n')}

Identify urgent restocks (items running out in <7 days) and provide:
1. Restocking priorities
2. Inventory management recommendations
3. Insights on stock patterns

Format as JSON:
{
  "urgentRestocks": [{"productName": "name", "currentStock": 0, "reason": "why urgent"}],
  "recommendations": ["rec1", "rec2", "rec3"],
  "insights": "Overall inventory insights"
}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {
    urgentRestocks: [],
    recommendations: ['Monitor stock levels regularly'],
    insights: 'Continue tracking sales to improve predictions.',
  };

  // Cache for 4 hours
  setCache(cacheKey, parsed, 240);
  return parsed;
}

/**
 * Daily Briefing Service - Comprehensive Business Summary
 * Combines sales, inventory, staff activity, and trends into a daily summary
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@server/prisma';
import {
    calculateProductMetrics,
    calculateSalesMetrics,
    detectInventoryAnomalies,
    calculateStaffRiskScores,
    detectHighDiscounts,
    generateTemplateBriefing,
    SalesMetrics,
} from '@server/utils/aiAnalytics.utils';

// Initialize Gemini AI
// Initialize Gemini AI lazily
const getGeminiModel = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not set in environment variables");
        throw new Error("GEMINI_API_KEY is missing. Please add it to your .env file.");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
};

// Simple cache
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
// TYPES
// ============================================

export interface DailyBriefing {
    headline: string;
    briefingText: string;
    riskAlerts: string[];
    recommendedActions: string[];
    whatsappPromo: string;
    metrics: {
        totalSales: number;
        totalRevenue: number;
        avgOrderValue: number;
        topProduct: string | null;
        lowStockCount: number;
    };
    comparison: {
        vsYesterday: string;
        trend: 'up' | 'down' | 'stable';
    };
    generatedAt: string;
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Generate comprehensive daily business briefing
 * Falls back to template if LLM fails
 */
export async function generateDailyBriefing(shopId: string): Promise<DailyBriefing> {
    const cacheKey = `daily_briefing_${shopId}_${new Date().toDateString()}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    // Date ranges
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
        // Fetch all required data concurrently
        const [
            todaysSales,
            yesterdaySales,
            products,
            activityLogs,
            shop,
        ] = await Promise.all([
            // Today's sales (Live)
            prisma.sale.findMany({
                where: { shopId, createdAt: { gte: todayStart } },
                include: {
                    saleItems: { include: { product: { select: { name: true } } } },
                    staff: { select: { id: true, name: true } },
                },
            }),
            // Yesterday's sales (for comparison)
            prisma.sale.findMany({
                where: { shopId, createdAt: { gte: yesterdayStart, lt: todayStart } },
                select: { totalAmount: true },
            }),
            // Products with 30-day sales
            prisma.product.findMany({
                where: { shopId },
                include: {
                    saleItems: {
                        where: { sale: { createdAt: { gte: thirtyDaysAgo } } },
                        select: { quantity: true, price: true },
                    },
                },
            }),
            // Activity logs (Today)
            prisma.activityLog.findMany({
                where: { shopId, createdAt: { gte: todayStart } },
                include: { staff: { select: { id: true, name: true } } },
            }),
            // Shop info
            prisma.shop.findUnique({
                where: { id: shopId },
                select: { name: true, target: true },
            }),
        ]);

        // Calculate metrics
        const productMetrics = calculateProductMetrics(products, 30);
        const salesMetrics = calculateSalesMetrics(todaysSales, productMetrics);
        const inventoryWarnings = detectInventoryAnomalies(products);

        // Get sale items with staff info for risk detection
        const saleItemsWithStaff = todaysSales.flatMap(sale =>
            sale.saleItems.map(item => ({
                ...item,
                saleId: sale.id,
                sale: {
                    orderId: sale.orderId,
                    staff: sale.staff,
                    createdAt: sale.createdAt,
                },
            }))
        );
        const suspiciousTransactions = detectHighDiscounts(saleItemsWithStaff);
        const staffRisks = calculateStaffRiskScores(activityLogs, suspiciousTransactions);

        // Calculate comparison (Today vs Yesterday)
        const todayRevenue = salesMetrics.totalRevenue;
        const yesterdayRevenue = yesterdaySales.reduce((s, x) => s + Number(x.totalAmount), 0);
        const percentChange = yesterdayRevenue > 0
            ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
            : todayRevenue > 0 ? '100' : '0';

        const trend: 'up' | 'down' | 'stable' =
            todayRevenue > yesterdayRevenue * 1.05 ? 'up' :
                todayRevenue < yesterdayRevenue * 0.95 ? 'down' : 'stable';

        // Build LLM prompt
        const prompt = `You are a business intelligence AI for ${shop?.name || 'a retail shop'}. Create a daily briefing based on TODAY'S live performance.

Today's Performance (Live):
- Sales: ${salesMetrics.totalSales} orders
- Revenue: ₦${salesMetrics.totalRevenue.toFixed(0)}
- Avg Order: ₦${salesMetrics.avgOrderValue.toFixed(0)}
- Trend: ${trend} (${percentChange}% vs yesterday)

Top Product: ${salesMetrics.topProducts[0]?.productName || 'N/A'}
Low Stock Items: ${inventoryWarnings.filter(w => w.type === 'low_stock').length}

Risks Detected Today:
- Suspicious transactions: ${suspiciousTransactions.length}
- Staff with flags: ${staffRisks.length}

Activity Summary: ${activityLogs.length} logged actions today

Generate JSON:
{
  "headline": "Catchy 1-line summary of TODAY",
  "briefingText": "2-3 sentence overview of today's progress so far",
  "riskAlerts": ["alert1", "alert2"],
  "recommendedActions": ["action1", "action2", "action3"],
  "whatsappPromo": "Under 200 char promo message with emojis to boost sales based on today's trends"
}`;

        let briefing: DailyBriefing;

        try {
            let model;
            try {
                model = getGeminiModel();
            } catch (initError) {
                console.warn('Skipping AI generation due to missing key');
                throw initError;
            }

            // Retry logic for 429 Rate Limits
            let result;
            let retries = 3;
            while (retries > 0) {
                try {
                    result = await model.generateContent(prompt);
                    break; // Success
                } catch (err: any) {
                    if (err.message?.includes('429') || err.status === 429) {
                        retries--;
                        if (retries === 0) throw err;
                        // Wait 2s, 4s, 8s...
                        const delay = 2000 * Math.pow(2, 3 - retries);
                        console.log(`Rate limit hit. Retrying in ${delay / 1000}s...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        throw err; // Not a rate limit error
                    }
                }
            }

            if (!result) throw new Error('Failed to generate content after retries');

            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                briefing = {
                    headline: parsed.headline || `${salesMetrics.totalSales} sales | ₦${salesMetrics.totalRevenue.toLocaleString()}`,
                    briefingText: parsed.briefingText || 'Business summary generated.',
                    riskAlerts: parsed.riskAlerts || [],
                    recommendedActions: parsed.recommendedActions || ['Continue monitoring sales'],
                    whatsappPromo: (parsed.whatsappPromo || '').slice(0, 200),
                    metrics: {
                        totalSales: salesMetrics.totalSales,
                        totalRevenue: salesMetrics.totalRevenue,
                        avgOrderValue: salesMetrics.avgOrderValue,
                        topProduct: salesMetrics.topProducts[0]?.productName || null,
                        lowStockCount: inventoryWarnings.filter(w => w.type === 'low_stock').length,
                    },
                    comparison: {
                        vsYesterday: `${percentChange}%`,
                        trend,
                    },
                    generatedAt: new Date().toISOString(),
                };
            } else {
                throw new Error('Invalid JSON response');
            }
        } catch (llmError: any) {
            if (llmError.message?.includes('429') || llmError.status === 429) {
                console.warn('AI Rate limit exceeded. Using template fallback.');
            } else {
                console.error('LLM failed, using template fallback:', llmError.message);
            }

            // Use template fallback
            const template = generateTemplateBriefing(salesMetrics, inventoryWarnings, staffRisks);

            briefing = {
                ...template,
                metrics: {
                    totalSales: salesMetrics.totalSales,
                    totalRevenue: salesMetrics.totalRevenue,
                    avgOrderValue: salesMetrics.avgOrderValue,
                    topProduct: salesMetrics.topProducts[0]?.productName || null,
                    lowStockCount: inventoryWarnings.filter(w => w.type === 'low_stock').length,
                },
                comparison: {
                    vsYesterday: `${percentChange}%`,
                    trend,
                },
                generatedAt: new Date().toISOString(),
            };
        }

        // Cache for 30 minutes (Live data needs frequent refreshment)
        setCache(cacheKey, briefing, 30);
        return briefing;

    } catch (error) {
        console.error('Error generating daily briefing:', error);
        throw new Error('Failed to generate daily briefing');
    }
}

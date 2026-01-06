/**
 * AI Marketing Service - Marketing Assistant
 * Generates promotional content and marketing recommendations
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@server/prisma';
import {
    calculateProductMetrics,
    identifySlowMovingItems,
    identifyTopPerformers,
    ProductSalesMetric,
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

export interface MarketingResponse {
    whatsappPromo: string; // Must be <200 chars
    recommendedDiscount: string;
    suggestedBundle: string;
    marketingActions: string[];
    slowMovingItems: Array<{ name: string; stock: number; suggestion: string }>;
    topPerformers: Array<{ name: string; soldCount: number }>;
    generatedAt: string;
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Generate marketing message and recommendations
 */
export async function generateMarketingMessage(shopId: string): Promise<MarketingResponse> {
    const cacheKey = `marketing_${shopId}_${new Date().toDateString()}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    // Get yesterday's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
        // Fetch products with sales data
        const products = await prisma.product.findMany({
            where: { shopId },
            include: {
                saleItems: {
                    where: {
                        sale: {
                            createdAt: { gte: thirtyDaysAgo },
                        },
                    },
                    select: {
                        quantity: true,
                        price: true,
                    },
                },
            },
        });

        // Fetch yesterday's sales
        const yesterdaySales = await prisma.sale.findMany({
            where: {
                shopId,
                createdAt: { gte: yesterday, lt: today },
            },
            select: { totalAmount: true },
        });

        // Calculate metrics
        const productMetrics = calculateProductMetrics(products, 30);
        const slowMoving = identifySlowMovingItems(productMetrics, 5);
        const topPerformers = identifyTopPerformers(productMetrics, 5);

        // Build prompt for LLM
        const prompt = `You are a marketing AI for a retail shop. Generate promotional content based on this data:

Yesterday's Sales: ${yesterdaySales.length} orders, ₦${yesterdaySales.reduce((s, x) => s + Number(x.totalAmount), 0).toFixed(0)} revenue

Top Performers (last 30 days):
${topPerformers.slice(0, 3).map(p => `- ${p.productName}: ${p.totalSold} sold, ₦${p.revenue.toFixed(0)} revenue`).join('\n')}

Slow Moving Items (need promotion):
${slowMoving.slice(0, 3).map(p => `- ${p.productName}: only ${p.totalSold} sold, ${p.currentStock} in stock`).join('\n')}

Generate JSON with:
1. whatsappPromo: WhatsApp message under 200 characters (include emojis)
2. recommendedDiscount: Specific discount suggestion
3. suggestedBundle: Bundle idea combining slow & popular items
4. marketingActions: Array of 2-3 specific actions

Format: {"whatsappPromo":"...","recommendedDiscount":"...","suggestedBundle":"...","marketingActions":["a","b","c"]}`;

        let response: MarketingResponse;

        try {
            const model = getGeminiModel();
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                response = {
                    whatsappPromo: (parsed.whatsappPromo || '').slice(0, 200),
                    recommendedDiscount: parsed.recommendedDiscount || 'Consider 10% off slow-moving items',
                    suggestedBundle: parsed.suggestedBundle || 'Bundle popular with slow items',
                    marketingActions: parsed.marketingActions || ['Post on social media', 'Send customer SMS'],
                    slowMovingItems: slowMoving.slice(0, 5).map(p => ({
                        name: p.productName,
                        stock: p.currentStock,
                        suggestion: `Consider ${p.totalSold === 0 ? '20%' : '10%'} discount`,
                    })),
                    topPerformers: topPerformers.slice(0, 5).map(p => ({
                        name: p.productName,
                        soldCount: p.totalSold,
                    })),
                    generatedAt: new Date().toISOString(),
                };
            } else {
                throw new Error('Invalid JSON response');
            }
        } catch (llmError) {
            console.error('LLM error in marketing:', llmError);

            // Fallback response
            const topProduct = topPerformers[0];
            const slowProduct = slowMoving[0];

            response = {
                whatsappPromo: topProduct
                    ? `🔥 ${topProduct.productName} is selling fast! Don't miss out - shop with us today! 🛒`
                    : '🛍️ Amazing deals await! Visit us today for quality products at great prices!',
                recommendedDiscount: slowProduct
                    ? `Offer 15% off ${slowProduct.productName} to boost sales`
                    : 'Consider running a 10% storewide promotion',
                suggestedBundle: topProduct && slowProduct
                    ? `Bundle ${topProduct.productName} with ${slowProduct.productName}`
                    : 'Create combo deals with complementary products',
                marketingActions: [
                    'Share top products on WhatsApp status',
                    'Offer loyalty discounts to repeat customers',
                    'Create bundle deals for slow items',
                ],
                slowMovingItems: slowMoving.slice(0, 5).map(p => ({
                    name: p.productName,
                    stock: p.currentStock,
                    suggestion: 'Consider promotional discount',
                })),
                topPerformers: topPerformers.slice(0, 5).map(p => ({
                    name: p.productName,
                    soldCount: p.totalSold,
                })),
                generatedAt: new Date().toISOString(),
            };
        }

        // Cache for 4 hours
        setCache(cacheKey, response, 240);
        return response;

    } catch (error) {
        console.error('Error generating marketing message:', error);
        throw new Error('Failed to generate marketing message');
    }
}

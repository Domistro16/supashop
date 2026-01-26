/**
 * AI Risk Service - Loss & Fraud Detection
 * Analyzes staff activity, refunds, price overrides, and inventory edits
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@server/prisma';
import {
    detectHighDiscounts,
    calculateStaffRiskScores,
    detectInventoryAnomalies,
    StaffRisk,
    SuspiciousTransaction,
    InventoryWarning,
} from '@server/utils/aiAnalytics.utils';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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

export interface RiskReport {
    staffRisks: StaffRisk[];
    suspiciousTransactions: SuspiciousTransaction[];
    inventoryWarnings: InventoryWarning[];
    overallRiskLevel: 'low' | 'medium' | 'high';
    summary: string;
    analyzedPeriod: string;
    generatedAt: string;
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Generate comprehensive risk report for a shop
 */
export async function generateRiskReport(shopId: string): Promise<RiskReport> {
    const cacheKey = `risk_report_${shopId}_${new Date().toDateString()}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    // Get yesterday's date range (analyze previous day's activity)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    try {
        // Fetch sale items with discounts
        const saleItems = await prisma.saleItem.findMany({
            where: {
                sale: {
                    shopId,
                    createdAt: { gte: yesterday, lt: today },
                },
            },
            include: {
                sale: {
                    include: {
                        staff: { select: { id: true, name: true } },
                    },
                },
            },
        });

        // Fetch activity logs
        const activityLogs = await prisma.activityLog.findMany({
            where: {
                shopId,
                createdAt: { gte: yesterday, lt: today },
            },
            include: {
                staff: { select: { id: true, name: true } },
            },
        });

        // Fetch products for inventory check
        const products = await prisma.product.findMany({
            where: { shopId },
            select: { id: true, name: true, stock: true },
        });

        // Calculate risks using utility functions
        const suspiciousTransactions = detectHighDiscounts(saleItems);
        const staffRisks = calculateStaffRiskScores(activityLogs, suspiciousTransactions);
        const inventoryWarnings = detectInventoryAnomalies(products);

        // Determine overall risk level
        const maxStaffRisk = Math.max(...staffRisks.map(s => s.riskScore), 0);
        const overallRiskLevel: 'low' | 'medium' | 'high' =
            maxStaffRisk > 50 || suspiciousTransactions.length > 5 ? 'high' :
                maxStaffRisk > 20 || suspiciousTransactions.length > 2 ? 'medium' : 'low';

        // Generate LLM summary if there are risk items
        let summary = 'No significant risks detected. Operations appear normal.';

        if (suspiciousTransactions.length > 0 || staffRisks.length > 0 || inventoryWarnings.length > 0) {
            try {
                const prompt = `You are a loss prevention AI. Analyze this risk data and provide a brief summary (max 100 words):

Risk Data:
- Suspicious Transactions: ${suspiciousTransactions.length}
- Staff with Risk Flags: ${staffRisks.length}
- Inventory Warnings: ${inventoryWarnings.length}
- Overall Risk Level: ${overallRiskLevel}

Top concerns:
${suspiciousTransactions.slice(0, 3).map(t => `- ${t.type}: ${t.reason}`).join('\n')}
${staffRisks.slice(0, 2).map(s => `- Staff ${s.staffName}: score ${s.riskScore}`).join('\n')}

Provide a concise risk assessment and priority actions.`;

                const result = await model.generateContent(prompt);
                summary = result.response.text().trim();
            } catch (llmError) {
                console.error('LLM error in risk report:', llmError);
                summary = `${overallRiskLevel.toUpperCase()} risk level. ${suspiciousTransactions.length} suspicious transactions detected. ${staffRisks.length} staff members flagged. ${inventoryWarnings.length} inventory issues found.`;
            }
        }

        const report: RiskReport = {
            staffRisks,
            suspiciousTransactions,
            inventoryWarnings,
            overallRiskLevel,
            summary,
            analyzedPeriod: yesterday.toISOString().split('T')[0],
            generatedAt: new Date().toISOString(),
        };

        // Cache for 6 hours
        setCache(cacheKey, report, 360);
        return report;

    } catch (error) {
        console.error('Error generating risk report:', error);
        throw new Error('Failed to generate risk report');
    }
}

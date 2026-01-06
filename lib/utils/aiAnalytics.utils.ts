/**
 * AI Analytics Utility Functions
 * Pure functions for data analysis - no LLM calls
 */

import { Decimal } from '@prisma/client/runtime/library';

// ============================================
// TYPES
// ============================================

export interface StaffRisk {
    staffId: string;
    staffName: string;
    riskScore: number; // 0-100
    reasons: string[];
}

export interface SuspiciousTransaction {
    saleId: string;
    orderId: string;
    type: 'high_discount' | 'refund' | 'void' | 'manual_override';
    amount: number;
    staffName: string;
    reason: string;
    createdAt: Date;
}

export interface InventoryWarning {
    productId: string;
    productName: string;
    type: 'unusual_decrease' | 'low_stock' | 'negative_stock' | 'rapid_depletion';
    currentStock: number;
    details: string;
}

export interface ProductSalesMetric {
    productId: string;
    productName: string;
    totalSold: number;
    revenue: number;
    avgDailySales: number;
    daysUntilStockout: number;
    currentStock: number;
}

export interface SalesMetrics {
    totalSales: number;
    totalRevenue: number;
    avgOrderValue: number;
    topProducts: ProductSalesMetric[];
    slowMovingItems: ProductSalesMetric[];
}

// ============================================
// RISK DETECTION UTILITIES
// ============================================

/**
 * Detect suspicious high discount transactions
 * Threshold: >20% discount is flagged
 */
export function detectHighDiscounts(
    saleItems: Array<{
        saleId: string;
        discountPercent: Decimal | number;
        price: Decimal | number;
        quantity: number;
        sale: {
            orderId: string;
            staff: { id: string; name: string };
            createdAt: Date;
        };
    }>
): SuspiciousTransaction[] {
    const DISCOUNT_THRESHOLD = 20;

    return saleItems
        .filter(item => Number(item.discountPercent) > DISCOUNT_THRESHOLD)
        .map(item => ({
            saleId: item.saleId,
            orderId: item.sale.orderId,
            type: 'high_discount' as const,
            amount: Number(item.price) * item.quantity,
            staffName: item.sale.staff.name,
            reason: `Applied ${Number(item.discountPercent)}% discount (threshold: ${DISCOUNT_THRESHOLD}%)`,
            createdAt: item.sale.createdAt,
        }));
}

/**
 * Calculate risk score for each staff member based on their activities
 */
export function calculateStaffRiskScores(
    activities: Array<{
        staffId: string;
        action: string;
        details: any;
        staff: { name: string };
    }>,
    suspiciousTransactions: SuspiciousTransaction[]
): StaffRisk[] {
    const staffMap = new Map<string, { name: string; score: number; reasons: string[] }>();

    // Count suspicious transactions per staff
    const txByStaff = suspiciousTransactions.reduce((acc, tx) => {
        acc[tx.staffName] = (acc[tx.staffName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Count risky activities per staff
    const riskyActions = ['delete_product', 'void_sale', 'update_stock', 'price_override'];

    for (const activity of activities) {
        const staffId = activity.staffId;
        const staffName = activity.staff.name;

        if (!staffMap.has(staffId)) {
            staffMap.set(staffId, { name: staffName, score: 0, reasons: [] });
        }

        const staff = staffMap.get(staffId)!;

        if (riskyActions.includes(activity.action)) {
            staff.score += 5;
            if (!staff.reasons.includes(`Multiple ${activity.action} actions`)) {
                staff.reasons.push(`Multiple ${activity.action} actions`);
            }
        }
    }

    // Add suspicious transaction scores
    for (const [name, count] of Object.entries(txByStaff)) {
        const staff = Array.from(staffMap.values()).find(s => s.name === name);
        if (staff) {
            staff.score += count * 10;
            staff.reasons.push(`${count} suspicious transactions flagged`);
        }
    }

    return Array.from(staffMap.entries())
        .map(([staffId, data]) => ({
            staffId,
            staffName: data.name,
            riskScore: Math.min(data.score, 100),
            reasons: data.reasons,
        }))
        .filter(s => s.riskScore > 0)
        .sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * Detect inventory anomalies
 */
export function detectInventoryAnomalies(
    products: Array<{
        id: string;
        name: string;
        stock: number;
    }>,
    stockChangeLogs?: Array<{
        productId: string;
        previousStock: number;
        newStock: number;
        changedAt: Date;
    }>
): InventoryWarning[] {
    const warnings: InventoryWarning[] = [];

    for (const product of products) {
        // Negative stock
        if (product.stock < 0) {
            warnings.push({
                productId: product.id,
                productName: product.name,
                type: 'negative_stock',
                currentStock: product.stock,
                details: `Stock is negative (${product.stock})`,
            });
        }
        // Low stock
        else if (product.stock <= 5 && product.stock > 0) {
            warnings.push({
                productId: product.id,
                productName: product.name,
                type: 'low_stock',
                currentStock: product.stock,
                details: `Only ${product.stock} units remaining`,
            });
        }
    }

    return warnings;
}

// ============================================
// MARKETING UTILITIES
// ============================================

/**
 * Identify slow-moving items (low sales in last 30 days)
 */
export function identifySlowMovingItems(
    productMetrics: ProductSalesMetric[],
    threshold: number = 5 // Less than 5 sales in 30 days
): ProductSalesMetric[] {
    return productMetrics
        .filter(p => p.totalSold < threshold && p.currentStock > 0)
        .sort((a, b) => a.totalSold - b.totalSold)
        .slice(0, 10);
}

/**
 * Identify top performing products
 */
export function identifyTopPerformers(
    productMetrics: ProductSalesMetric[],
    limit: number = 5
): ProductSalesMetric[] {
    return productMetrics
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
}

/**
 * Calculate product sales metrics
 */
export function calculateProductMetrics(
    products: Array<{
        id: string;
        name: string;
        stock: number;
        price: Decimal | number;
        saleItems: Array<{
            quantity: number;
            price: Decimal | number;
        }>;
    }>,
    periodDays: number = 30
): ProductSalesMetric[] {
    return products.map(product => {
        const totalSold = product.saleItems.reduce((sum, item) => sum + item.quantity, 0);
        const revenue = product.saleItems.reduce(
            (sum, item) => sum + Number(item.price) * item.quantity,
            0
        );
        const avgDailySales = totalSold / periodDays;
        const daysUntilStockout = avgDailySales > 0
            ? Math.floor(product.stock / avgDailySales)
            : 999;

        return {
            productId: product.id,
            productName: product.name,
            totalSold,
            revenue,
            avgDailySales,
            daysUntilStockout,
            currentStock: product.stock,
        };
    });
}

/**
 * Calculate overall sales metrics
 */
export function calculateSalesMetrics(
    sales: Array<{
        totalAmount: Decimal | number;
    }>,
    productMetrics: ProductSalesMetric[]
): SalesMetrics {
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);

    return {
        totalSales: sales.length,
        totalRevenue,
        avgOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
        topProducts: identifyTopPerformers(productMetrics),
        slowMovingItems: identifySlowMovingItems(productMetrics),
    };
}

// ============================================
// FALLBACK TEMPLATE GENERATORS
// ============================================

/**
 * Generate template-based daily briefing when LLM fails
 */
export function generateTemplateBriefing(
    salesMetrics: SalesMetrics,
    inventoryWarnings: InventoryWarning[],
    staffRisks: StaffRisk[]
): {
    headline: string;
    briefingText: string;
    riskAlerts: string[];
    recommendedActions: string[];
    whatsappPromo: string;
} {
    const headline = salesMetrics.totalSales > 0
        ? `${salesMetrics.totalSales} sales made | ₦${salesMetrics.totalRevenue.toLocaleString()} revenue`
        : 'No sales recorded yet today';

    const briefingText = `Today's performance: ${salesMetrics.totalSales} orders with average value of ₦${salesMetrics.avgOrderValue.toFixed(0)}. ${inventoryWarnings.length} inventory alerts need attention.`;

    const riskAlerts = [
        ...inventoryWarnings.slice(0, 3).map(w => `${w.productName}: ${w.details}`),
        ...staffRisks.filter(s => s.riskScore > 30).map(s => `Staff alert: ${s.staffName}`),
    ];

    const recommendedActions = [];
    if (inventoryWarnings.some(w => w.type === 'low_stock')) {
        recommendedActions.push('Restock low inventory items');
    }
    if (salesMetrics.slowMovingItems.length > 0) {
        recommendedActions.push(`Consider promotions for ${salesMetrics.slowMovingItems[0]?.productName}`);
    }
    if (recommendedActions.length === 0) {
        recommendedActions.push('Continue monitoring sales performance');
    }

    const topProduct = salesMetrics.topProducts[0];
    const whatsappPromo = topProduct
        ? `🔥 ${topProduct.productName} is selling fast! Get yours now before stock runs out! Shop with us today.`
        : '🛒 Check out our amazing products today! Quality items at great prices.';

    return {
        headline,
        briefingText,
        riskAlerts,
        recommendedActions,
        whatsappPromo: whatsappPromo.slice(0, 200), // Ensure <200 chars
    };
}

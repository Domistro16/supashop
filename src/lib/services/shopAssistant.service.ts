/**
 * Shop Assistant - natural-language Q&A over a shop's live data.
 *
 * Assembles a compact context snapshot (recent sales, top products, low stock,
 * outstanding debt, expiring stock) and sends it alongside the user's question
 * to Gemini. Answers are grounded in the snapshot — no free-form speculation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@server/prisma';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const formatNaira = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n);

type AskResult = {
    answer: string;
    snapshotAt: string;
};

async function buildShopSnapshot(shopId: string): Promise<string> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [shop, productStats, recentSales, topSelling, lowStock, outstanding] =
        await Promise.all([
            prisma.shop.findUnique({ where: { id: shopId }, select: { name: true } }),
            prisma.product.aggregate({
                where: { shopId },
                _count: true,
                _sum: { stock: true },
            }),
            prisma.sale.findMany({
                where: { shopId, createdAt: { gte: thirtyDaysAgo } },
                select: { totalAmount: true, createdAt: true, paymentStatus: true },
            }),
            prisma.saleItem.groupBy({
                by: ['productId'],
                where: { sale: { shopId, createdAt: { gte: thirtyDaysAgo } } },
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 5,
            }),
            prisma.product.findMany({
                where: { shopId, stock: { lte: 5 } },
                select: { name: true, stock: true },
                take: 10,
                orderBy: { stock: 'asc' },
            }),
            prisma.sale.aggregate({
                where: { shopId, paymentStatus: 'pending' },
                _sum: { outstandingBalance: true },
                _count: true,
            }),
        ]);

    const topSellingEnriched = await Promise.all(
        topSelling.map(async (s) => {
            const p = await prisma.product.findUnique({
                where: { id: s.productId },
                select: { name: true },
            });
            return { name: p?.name || 'Unknown', qty: s._sum.quantity || 0 };
        })
    );

    const salesLast30 = recentSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const salesLast7 = recentSales
        .filter((s) => s.createdAt >= sevenDaysAgo)
        .reduce((sum, s) => sum + Number(s.totalAmount), 0);

    const lines: string[] = [];
    lines.push(`Shop: ${shop?.name || 'Unknown'}`);
    lines.push(`Snapshot taken: ${now.toISOString()}`);
    lines.push('');
    lines.push('=== Totals ===');
    lines.push(`Total products: ${productStats._count}`);
    lines.push(`Total stock units: ${productStats._sum.stock ?? 0}`);
    lines.push(`Revenue last 30 days: ${formatNaira(salesLast30)} (${recentSales.length} sales)`);
    lines.push(`Revenue last 7 days: ${formatNaira(salesLast7)}`);
    lines.push(
        `Outstanding debt: ${formatNaira(Number(outstanding._sum.outstandingBalance || 0))} across ${outstanding._count} pending sales`
    );
    lines.push('');
    lines.push('=== Top sellers (last 30 days) ===');
    if (topSellingEnriched.length === 0) lines.push('(no sales data)');
    for (const t of topSellingEnriched) lines.push(`- ${t.name} — ${t.qty} sold`);
    lines.push('');
    lines.push('=== Low stock (<=5 units) ===');
    if (lowStock.length === 0) lines.push('(none)');
    for (const p of lowStock) lines.push(`- ${p.name}: ${p.stock} left`);

    return lines.join('\n');
}

export async function askShopAssistant(
    shopId: string,
    question: string,
    history?: { role: 'user' | 'assistant'; content: string }[]
): Promise<AskResult> {
    const snapshot = await buildShopSnapshot(shopId);
    const now = new Date();

    const historyText = history && history.length > 0
        ? history.slice(-6).map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')
        : '(no prior messages)';

    const prompt = `You are Supashop's in-app shop assistant. You help a Nigerian shopkeeper make sense of their business using only the snapshot below. Be concise (2–5 sentences), use Nigerian Naira for money, and cite specific numbers/products from the snapshot. If the data doesn't answer the question, say so plainly — never invent figures.

=== SHOP DATA SNAPSHOT ===
${snapshot}
=== END SNAPSHOT ===

=== CONVERSATION HISTORY ===
${historyText}
=== END HISTORY ===

User question: ${question}

Answer:`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();

    return {
        answer,
        snapshotAt: now.toISOString(),
    };
}

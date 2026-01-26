import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { verifyAuth, getShopId } from '@server/middleware/auth';

export async function GET(request: NextRequest) {
    try {
        const authResult = await verifyAuth(request);
        if (!authResult.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const shopId = getShopId(request);
        if (!shopId) {
            return NextResponse.json({ error: 'Shop context required' }, { status: 400 });
        }

        // Define time ranges (User's local time handling would ideally be improved, but assuming server time for now)
        // To be precise with "Today" in a real app, we'd accept a 'timezone' query param.
        // For now, we use UTC days or simple server dates.
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);

        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);

        // 1. Fetch Installments (Revenue)
        // We need installments created today/yesterday for ANY sale belonging to this shop.
        const getInstallmentStats = async (start: Date, end: Date) => {
            const installments = await prisma.installment.findMany({
                where: {
                    sale: {
                        shopId: shopId,
                    },
                    createdAt: {
                        gte: start,
                        lt: end,
                    },
                },
                include: {
                    sale: {
                        include: {
                            saleItems: true, // Needed for profit calc
                        },
                    },
                },
            });

            let revenue = 0;
            let profit = 0;

            for (const inst of installments) {
                const amount = Number(inst.amount);
                revenue += amount;

                // Calculate Profit for this installment portion
                // Margin = (TotalSale - TotalCost) / TotalSale
                const sale = inst.sale;
                const saleTotal = Number(sale.totalAmount);

                let totalCost = 0;
                if (sale.saleItems) {
                    totalCost = sale.saleItems.reduce((acc, item) => {
                        const cost = Number(item.costPrice) > 0 ? Number(item.costPrice) : 0; // fallback handled in other places too
                        return acc + (item.quantity * cost);
                    }, 0);
                }

                if (saleTotal > 0) {
                    const saleProfit = saleTotal - totalCost;
                    const margin = saleProfit / saleTotal;
                    // Realized profit for this installment
                    profit += (amount * margin);
                }
            }

            return { revenue, profit };
        };

        const todayStats = await getInstallmentStats(startOfToday, endOfToday);
        const yesterdayStats = await getInstallmentStats(startOfYesterday, startOfToday);

        // 2. Fetch Sales Count (Volume)
        // Users typically want "How many orders did I get today?", not "How many payments".
        // So we query the Sale table for this metric.
        const getSalesCount = async (start: Date, end: Date) => {
            return await prisma.sale.count({
                where: {
                    shopId,
                    createdAt: {
                        gte: start,
                        lt: end,
                    }
                }
            });
        };

        const todayCount = await getSalesCount(startOfToday, endOfToday);
        const yesterdayCount = await getSalesCount(startOfYesterday, startOfToday);


        // 3. Calculate Changes
        const revenueChange = yesterdayStats.revenue === 0
            ? 100
            : ((todayStats.revenue - yesterdayStats.revenue) / yesterdayStats.revenue) * 100;

        const profitChange = yesterdayStats.profit === 0
            ? 100
            : ((todayStats.profit - yesterdayStats.profit) / yesterdayStats.profit) * 100;

        const salesChange = yesterdayCount === 0
            ? 100
            : ((todayCount - yesterdayCount) / yesterdayCount) * 100;

        return NextResponse.json({
            revenue: todayStats.revenue,
            profit: todayStats.profit,
            salesCount: todayCount,
            revenueChange,
            profitChange,
            salesChange
        });

    } catch (error) {
        console.error('Get stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}

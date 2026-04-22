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

        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const category = searchParams.get('category');
        const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '100', 10) || 100));

        const where: any = { shopId };
        if (from || to) {
            where.expenseDate = {};
            if (from) where.expenseDate.gte = new Date(from);
            if (to) where.expenseDate.lte = new Date(to);
        }
        if (category) where.category = category;

        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { expenseDate: 'desc' },
            take: limit,
            include: {
                paidByUser: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

        return NextResponse.json({ expenses, total });
    } catch (error) {
        console.error('Get expenses error:', error);
        return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const authResult = await verifyAuth(request);
        if (!authResult.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const shopId = getShopId(request);
        if (!shopId) {
            return NextResponse.json({ error: 'Shop context required' }, { status: 400 });
        }

        const body = await request.json();
        const { category, amount, note, attachmentUrl, paidBy, expenseDate } = body;

        if (!category || typeof category !== 'string' || category.trim().length === 0) {
            return NextResponse.json({ error: 'Category is required' }, { status: 400 });
        }
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
        }

        const expense = await prisma.expense.create({
            data: {
                shopId,
                category: category.trim().slice(0, 80),
                amount: numericAmount,
                note: typeof note === 'string' && note.trim().length > 0 ? note.trim().slice(0, 500) : null,
                attachmentUrl: typeof attachmentUrl === 'string' && attachmentUrl.trim().length > 0 ? attachmentUrl.trim() : null,
                paidBy: paidBy || authResult.user.id,
                expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
            },
            include: {
                paidByUser: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        await prisma.activityLog.create({
            data: {
                shopId,
                staffId: authResult.user.id,
                action: 'record_expense',
                details: {
                    expenseId: expense.id,
                    category: expense.category,
                    amount: expense.amount.toString(),
                },
            },
        });

        return NextResponse.json(expense);
    } catch (error) {
        console.error('Create expense error:', error);
        return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }
}

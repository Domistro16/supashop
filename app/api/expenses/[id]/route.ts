import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@server/prisma';
import { verifyAuth, getShopId } from '@server/middleware/auth';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await verifyAuth(request);
        if (!authResult.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const shopId = getShopId(request);
        if (!shopId) {
            return NextResponse.json({ error: 'Shop context required' }, { status: 400 });
        }

        const { id } = await params;
        const existing = await prisma.expense.findFirst({ where: { id, shopId } });
        if (!existing) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        const body = await request.json();
        const { category, amount, note, attachmentUrl, expenseDate } = body;

        const data: any = {};
        if (typeof category === 'string' && category.trim().length > 0) {
            data.category = category.trim().slice(0, 80);
        }
        if (amount !== undefined) {
            const numericAmount = Number(amount);
            if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
                return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
            }
            data.amount = numericAmount;
        }
        if (note !== undefined) {
            data.note = typeof note === 'string' && note.trim().length > 0 ? note.trim().slice(0, 500) : null;
        }
        if (attachmentUrl !== undefined) {
            data.attachmentUrl = typeof attachmentUrl === 'string' && attachmentUrl.trim().length > 0 ? attachmentUrl.trim() : null;
        }
        if (expenseDate) {
            data.expenseDate = new Date(expenseDate);
        }

        const expense = await prisma.expense.update({
            where: { id },
            data,
            include: {
                paidByUser: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        return NextResponse.json(expense);
    } catch (error) {
        console.error('Update expense error:', error);
        return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await verifyAuth(request);
        if (!authResult.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const shopId = getShopId(request);
        if (!shopId) {
            return NextResponse.json({ error: 'Shop context required' }, { status: 400 });
        }

        const { id } = await params;
        const existing = await prisma.expense.findFirst({ where: { id, shopId } });
        if (!existing) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }

        await prisma.expense.delete({ where: { id } });

        await prisma.activityLog.create({
            data: {
                shopId,
                staffId: authResult.user.id,
                action: 'delete_expense',
                details: {
                    expenseId: id,
                    category: existing.category,
                    amount: existing.amount.toString(),
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete expense error:', error);
        return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
    }
}

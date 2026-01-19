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
        const body = await request.json();
        const {
            amountPaid,
            paymentMethod,
            bankName,
            accountNumber,
        } = body;

        if (!amountPaid || amountPaid <= 0) {
            return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
        }

        // Find sale
        const sale = await prisma.sale.findFirst({
            where: {
                shopId,
                OR: [
                    { id },
                    { orderId: id }
                ]
            },
        });

        if (!sale) {
            return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
        }

        if (sale.paymentStatus === 'completed') {
            return NextResponse.json({ error: 'Sale is already fully paid' }, { status: 400 });
        }

        const previousAmountPaid = Number(sale.amountPaid);
        const totalAmount = Number(sale.totalAmount);

        // Check overpayment
        if (previousAmountPaid + Number(amountPaid) > totalAmount) {
            return NextResponse.json({
                error: `Amount exceeds outstanding balance of ${(totalAmount - previousAmountPaid).toLocaleString()}`
            }, { status: 400 });
        }

        const newAmountPaid = previousAmountPaid + Number(amountPaid);
        const newOutstandingBalance = Math.max(0, totalAmount - newAmountPaid);
        const newPaymentStatus = newOutstandingBalance > 0 ? 'pending' : 'completed';

        const updatedSale = await prisma.$transaction(async (tx) => {
            // Create installment record
            await tx.installment.create({
                data: {
                    saleId: sale.id, // Use UUID from found sale
                    amount: amountPaid,
                    paymentMethod: paymentMethod || 'cash',
                    bankName: bankName || null,
                    accountNumber: accountNumber || null,
                },
            });

            // Update sale totals
            return tx.sale.update({
                where: { id: sale.id },
                data: {
                    amountPaid: newAmountPaid,
                    outstandingBalance: newOutstandingBalance,
                    paymentStatus: newPaymentStatus,
                },
                include: {
                    installments: {
                        orderBy: { createdAt: 'asc' },
                    },
                },
            });
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                shopId,
                staffId: authResult.user.id,
                action: 'add_installment',
                details: {
                    saleId: sale.id,
                    orderId: sale.orderId,
                    amountAdded: amountPaid.toString(),
                    paymentStatus: newPaymentStatus,
                },
            },
        });

        return NextResponse.json(updatedSale);
    } catch (error) {
        console.error('Update payment error:', error);
        return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getStorefrontShopWhere(shopName: string) {
    return {
        OR: [
            { name: { equals: shopName, mode: 'insensitive' as const } },
            { name: { equals: shopName.replace(/-/g, ' '), mode: 'insensitive' as const } }
        ]
    };
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { shopName, items, customer, note } = body;

        if (!shopName || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Shop and at least one item are required' }, { status: 400 });
        }

        // 1. Get Shop
        const shop = await prisma.shop.findFirst({
            where: getStorefrontShopWhere(shopName),
            include: { owner: true }
        });

        if (!shop) {
            return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
        }

        // 2. Validate Items & Calculate Total (Safety check)
        let totalAmount = 0;
        const saleItemsData = [];

        for (const item of items) {
            const product = await prisma.product.findUnique({
                where: { id: item.productId }
            });

            if (!product) continue;

            // Simple validation: Ensure price matches DB (optional, but safer)
            // For now, trusting client price IS NOT SAFE strictly but acceptable for MVP if we verify later.
            // Better: Use DB price.
            const price = Number(product.price);
            const quantity = item.quantity;
            const subtotal = price * quantity;

            totalAmount += subtotal;

            saleItemsData.push({
                productId: product.id,
                quantity: quantity,
                price: price, // Store unit price at time of sale
                discountPercent: 0
            });
        }

        if (saleItemsData.length === 0) {
            return NextResponse.json({ error: 'No valid items found for this order' }, { status: 400 });
        }

        // 3. Get or Create Customer
        // If customerId is provided (authenticated user), use it directly
        // Otherwise, try to find/create from guest info
        let customerId = body.customerId || null;

        if (!customerId && customer?.phone) {
            // Guest checkout - try to find existing customer by phone in this shop
            const existing = await prisma.customer.findFirst({
                where: { shopId: shop.id, phone: customer.phone }
            });

            if (existing) {
                customerId = existing.id;
            } else {
                const newCustomer = await prisma.customer.create({
                    data: {
                        shopId: shop.id,
                        name: customer.name,
                        phone: customer.phone,
                        email: customer.email,
                        address: "Online Order"
                    }
                });
                customerId = newCustomer.id;
            }
        }

        // 4. Generate Order ID
        const orderId = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

        // Extract payment info from request (if provided by customer)
        const paymentType = body.paymentType || 'full';
        const supportsBankTransfer = Boolean(
            shop.transferBankName &&
            shop.transferAccountName &&
            shop.transferAccountNumber
        );
        const paymentMethod = body.paymentMethod || (supportsBankTransfer ? 'bank_transfer' : 'cash');
        const initialPayment = body.amountPaid ? Number(body.amountPaid) : 0;

        if (paymentType === 'installment' && paymentMethod !== 'bank_transfer') {
            return NextResponse.json(
                { error: 'Installment orders currently require bank transfer' },
                { status: 400 }
            );
        }

        if (paymentMethod === 'bank_transfer' && !supportsBankTransfer) {
            return NextResponse.json(
                { error: 'This shop has not configured bank transfer details yet' },
                { status: 400 }
            );
        }

        // Calculate outstanding balance based on payment type
        const amountPaid = paymentType === 'full' ? 0 : initialPayment;
        const outstandingBalance = Math.max(totalAmount - amountPaid, 0);
        const paymentStatus = outstandingBalance <= 0 ? 'completed' : 'pending';

        // 5. Create Sale
        const sale = await prisma.sale.create({
            data: {
                orderId,
                shopId: shop.id,
                staffId: shop.ownerId, // Assign to owner initially? Or need a generic 'system' user?
                // Existing schema requires `staffId` (User relation).
                // Assigning to Owner is safest fallback.
                customerId,
                totalAmount,
                amountPaid,
                outstandingBalance,
                paymentStatus,
                paymentType,
                paymentMethod,
                bankName: paymentMethod === 'bank_transfer' ? shop.transferBankName : null,
                accountNumber: paymentMethod === 'bank_transfer' ? shop.transferAccountNumber : null,

                // Online Specifics
                isOnlineOrder: true,
                orderStatus: 'payment_pending', // Waiting for receipt
                customerNote: note,

                saleItems: {
                    create: saleItemsData
                }
            }
        });

        // For installment orders with an initial payment, create an Installment record
        // so the customer can attach a proof image for that specific payment.
        if (paymentType === 'installment' && amountPaid > 0) {
            await prisma.installment.create({
                data: {
                    saleId: sale.id,
                    amount: amountPaid,
                    paymentMethod,
                }
            });
        }

        return NextResponse.json({ success: true, orderId: sale.id, paymentType }); // Return UUID for lookup
    } catch (error) {
        console.error('Online Order Error:', error);
        return NextResponse.json({ error: 'Failed to process order' }, { status: 500 });
    }
}

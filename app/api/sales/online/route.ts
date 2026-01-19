import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SaleItem } from '@/lib/api';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { shopName, items, customer, note } = body;

        // 1. Get Shop
        const shop = await prisma.shop.findFirst({
            where: { name: { equals: shopName, mode: 'insensitive' } },
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
        const paymentMethod = body.paymentMethod || 'bank_transfer'; // Default for online orders
        const bankName = body.bankName || null;
        const accountNumber = body.accountNumber || null;
        const initialPayment = body.amountPaid ? Number(body.amountPaid) : 0;

        // Calculate outstanding balance based on payment type
        const amountPaid = paymentType === 'full' ? 0 : initialPayment;
        const outstandingBalance = totalAmount - amountPaid;
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
                bankName,
                accountNumber,

                // Online Specifics
                isOnlineOrder: true,
                orderStatus: 'payment_pending', // Waiting for receipt
                customerNote: note,

                saleItems: {
                    create: saleItemsData
                }
            }
        });

        return NextResponse.json({ success: true, orderId: sale.id }); // Return UUID for lookup
    } catch (error) {
        console.error('Online Order Error:', error);
        return NextResponse.json({ error: 'Failed to process order' }, { status: 500 });
    }
}

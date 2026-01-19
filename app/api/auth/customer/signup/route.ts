import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const { name, email, phone, password, shopName } = await req.json();

        // Validate required fields
        if (!name || !email || !phone || !password) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        // Check if customer with email already exists
        const existingCustomer = await prisma.customer.findFirst({
            where: { email: email.toLowerCase() }
        });

        if (existingCustomer) {
            return NextResponse.json(
                { error: 'An account with this email already exists' },
                { status: 400 }
            );
        }

        // Find the shop
        const shop = await prisma.shop.findFirst({
            where: { name: { equals: shopName as string, mode: 'insensitive' } }
        });

        if (!shop) {
            return NextResponse.json(
                { error: 'Shop not found' },
                { status: 404 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create customer
        const customer = await prisma.customer.create({
            data: {
                name,
                email: email.toLowerCase(),
                phone,
                password: hashedPassword,
                shopId: shop.id,
            }
        });

        return NextResponse.json({
            success: true,
            customerId: customer.id,
            message: 'Account created successfully'
        });

    } catch (error) {
        console.error('Customer signup error:', error);
        return NextResponse.json(
            { error: 'Failed to create account' },
            { status: 500 }
        );
    }
}

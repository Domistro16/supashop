import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Find customer by email
        const customer = await prisma.customer.findFirst({
            where: { email: email.toLowerCase() }
        });

        if (!customer || !customer.password) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, customer.password);

        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Generate JWT token
        const token = jwt.sign(
            { customerId: customer.id, email: customer.email },
            process.env.JWT_SECRET || 'customer-secret-key',
            { expiresIn: '7d' }
        );

        return NextResponse.json({
            success: true,
            token,
            customerId: customer.id,
            customer: {
                id: customer.id,
                name: customer.name,
                email: customer.email,
            }
        });

    } catch (error) {
        console.error('Customer signin error:', error);
        return NextResponse.json(
            { error: 'Failed to sign in' },
            { status: 500 }
        );
    }
}

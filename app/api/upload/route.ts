import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PinataSDK } from "pinata";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const orderId = formData.get('orderId') as string;

        if (!file || !orderId) {
            return NextResponse.json({ error: 'Missing file or orderId' }, { status: 400 });
        }

        const pinata = new PinataSDK({
            pinataJwt: process.env.PINATA_JWT,
            pinataGateway: process.env.PINATA_GATEWAY,
        });

        const upload = await pinata.upload.file(file);
        // URL construction
        const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
        const url = `https://${gateway}/ipfs/${upload.IpfsHash}`;

        // Update Sale with proof
        await prisma.sale.update({
            where: { id: orderId },
            data: {
                proofOfPayment: url,
                orderStatus: 'payment_review'
            }
        });

        return NextResponse.json({ success: true, url });
    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}

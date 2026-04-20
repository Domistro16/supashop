import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseStorage, PROOF_BUCKET } from '@/lib/supabaseStorage';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const orderId = formData.get('orderId') as string | null;
        const installmentId = formData.get('installmentId') as string | null;

        if (!file || !orderId) {
            return NextResponse.json({ error: 'Missing file or orderId' }, { status: 400 });
        }

        if (file.size > MAX_BYTES) {
            return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
        }

        if (file.type && !ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
        }

        const sale = await prisma.sale.findUnique({
            where: { id: orderId },
            select: { id: true, shopId: true, orderId: true, paymentType: true },
        });
        if (!sale) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        let installment: { id: string } | null = null;
        if (installmentId) {
            const found = await prisma.installment.findFirst({
                where: { id: installmentId, saleId: sale.id },
                select: { id: true },
            });
            if (!found) {
                return NextResponse.json({ error: 'Installment not found for this order' }, { status: 404 });
            }
            installment = found;
        } else if (sale.paymentType === 'installment') {
            return NextResponse.json(
                { error: 'Installment orders require an installmentId per proof' },
                { status: 400 },
            );
        }

        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 8);
        const subpath = installment ? `installments/${installment.id}` : 'sale';
        const path = `${sale.shopId}/${sale.id}/${subpath}/${Date.now()}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        const { error: uploadError } = await supabaseStorage.storage
            .from(PROOF_BUCKET)
            .upload(path, bytes, {
                contentType: file.type || 'image/jpeg',
                upsert: false,
                cacheControl: '3600',
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            return NextResponse.json({ error: uploadError.message || 'Upload failed' }, { status: 500 });
        }

        const { data: publicData } = supabaseStorage.storage
            .from(PROOF_BUCKET)
            .getPublicUrl(path);

        const url = publicData?.publicUrl;
        if (!url) {
            return NextResponse.json({ error: 'Failed to get public URL' }, { status: 500 });
        }

        if (installment) {
            await prisma.installment.update({
                where: { id: installment.id },
                data: { proofOfPayment: url },
            });
            // Flip sale into review if it's still awaiting proof
            await prisma.sale.update({
                where: { id: sale.id },
                data: { orderStatus: 'payment_review' },
            });
        } else {
            await prisma.sale.update({
                where: { id: sale.id },
                data: {
                    proofOfPayment: url,
                    orderStatus: 'payment_review',
                },
            });
        }

        return NextResponse.json({ success: true, url });
    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 500 });
    }
}

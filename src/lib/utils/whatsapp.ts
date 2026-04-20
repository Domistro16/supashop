/**
 * WhatsApp deep-linking utilities.
 * We generate wa.me URLs that open the user's own WhatsApp with the message
 * pre-typed. No API, no verification, no per-message cost.
 */

export function normalizePhone(phone: string | null | undefined, defaultCountryCode = '234'): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;

    // Nigerian local format (0XXXXXXXXXX) → strip leading 0, prefix 234
    if (digits.startsWith('0') && digits.length === 11) {
        return defaultCountryCode + digits.slice(1);
    }
    // Already has country code
    if (digits.startsWith(defaultCountryCode)) return digits;
    // International / other — return as-is (assume user typed full number)
    return digits;
}

export function waLink(phone: string | null | undefined, message: string): string | null {
    const number = normalizePhone(phone);
    if (!number) return null;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function formatCurrency(n: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n);
}

type ShopBrand = { name?: string | null; address?: string | null };

export function receiptMessage(args: {
    shop: ShopBrand;
    customerName?: string | null;
    orderId: string;
    items: { name: string; quantity: number; lineTotal: number }[];
    total: number;
    amountPaid?: number;
    outstandingBalance?: number;
}): string {
    const { shop, customerName, orderId, items, total, amountPaid, outstandingBalance } = args;
    const greeting = customerName ? `Hi ${customerName},` : 'Hello,';
    const lines: string[] = [];
    lines.push(`${greeting}`);
    lines.push(`Here is your receipt from *${shop.name || 'our shop'}*.`);
    lines.push('');
    lines.push(`Order: #${orderId}`);
    lines.push('');
    lines.push('*Items*');
    for (const item of items) {
        lines.push(`• ${item.name} × ${item.quantity} — ${formatCurrency(item.lineTotal)}`);
    }
    lines.push('');
    lines.push(`*Total: ${formatCurrency(total)}*`);
    if (typeof amountPaid === 'number' && amountPaid > 0 && amountPaid < total) {
        lines.push(`Paid: ${formatCurrency(amountPaid)}`);
    }
    if (typeof outstandingBalance === 'number' && outstandingBalance > 0) {
        lines.push(`Balance: ${formatCurrency(outstandingBalance)}`);
    }
    lines.push('');
    lines.push('Thank you for your patronage 🙏');
    return lines.join('\n');
}

export function orderReadyMessage(args: {
    shopName: string;
    customerName?: string | null;
    orderId: string;
    address?: string | null;
}): string {
    const greeting = args.customerName ? `Hi ${args.customerName},` : 'Hello,';
    return [
        greeting,
        `Your order #${args.orderId} from *${args.shopName}* is ready for collection.`,
        args.address ? `📍 ${args.address}` : null,
        '',
        'Thank you!',
    ]
        .filter(Boolean)
        .join('\n');
}

export function paymentVerifiedMessage(args: {
    shopName: string;
    customerName?: string | null;
    orderId: string;
    amount: number;
}): string {
    const greeting = args.customerName ? `Hi ${args.customerName},` : 'Hello,';
    return [
        greeting,
        `We've confirmed your payment of ${formatCurrency(args.amount)} for order #${args.orderId} at *${args.shopName}*.`,
        '',
        'Thanks! 🙏',
    ].join('\n');
}

export function debtReminderMessage(args: {
    shopName: string;
    customerName?: string | null;
    outstandingBalance: number;
    orderId?: string;
}): string {
    const greeting = args.customerName ? `Hi ${args.customerName},` : 'Hello,';
    const orderRef = args.orderId ? ` on order #${args.orderId}` : '';
    return [
        greeting,
        `This is a friendly reminder about your outstanding balance${orderRef} of *${formatCurrency(args.outstandingBalance)}* at ${args.shopName}.`,
        'Please let us know when we can expect payment.',
        '',
        'Thank you.',
    ].join('\n');
}

export function restockNudgeMessage(args: {
    shopName: string;
    supplierName?: string | null;
    products: { name: string; currentStock: number }[];
}): string {
    const greeting = args.supplierName ? `Hi ${args.supplierName},` : 'Hello,';
    const lines = [
        greeting,
        `We'd like to restock the following items at *${args.shopName}*:`,
        '',
    ];
    for (const p of args.products) {
        lines.push(`• ${p.name} (currently ${p.currentStock} in stock)`);
    }
    lines.push('');
    lines.push('Please confirm availability and price. Thank you.');
    return lines.join('\n');
}

export function comeBackSoonMessage(args: { shopName: string; customerName?: string | null }): string {
    const greeting = args.customerName ? `Hi ${args.customerName},` : 'Hello,';
    return [
        greeting,
        `Thanks for shopping at *${args.shopName}*! We hope to see you again soon. 🙏`,
    ].join('\n');
}

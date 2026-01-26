/**
 * Supplier Notification Service
 * 
 * Stub for sending purchase orders to suppliers via email/webhook.
 * In production, integrate with email service (SendGrid, SES, etc.) or webhook system.
 */

import { prisma } from '@server/prisma';



interface PurchaseOrderWithDetails {
    id: string;
    poNumber: string;
    totalAmount: any;
    notes?: string | null;
    supplier: {
        id: string;
        name: string;
        email?: string | null;
        contactPerson?: string | null;
    };
    items: Array<{
        product: {
            id: string;
            name: string;
        };
        quantityOrdered: number;
        unitCost: any;
    }>;
    shop: {
        name: string;
        address?: string | null;
    };
}

/**
 * Send purchase order to supplier (STUB)
 * 
 * In production, this would:
 * - Send email to supplier.email with PO details
 * - Or trigger a webhook to supplier's system
 * - Or integrate with EDI system
 */
export async function sendPurchaseOrderToSupplier(
    po: PurchaseOrderWithDetails
): Promise<{ success: boolean; method: string; message: string }> {
    console.log('========================================');
    console.log('[STUB] Sending Purchase Order to Supplier');
    console.log('========================================');
    console.log(`PO Number: ${po.poNumber}`);
    console.log(`Supplier: ${po.supplier.name}`);
    console.log(`Supplier Email: ${po.supplier.email || 'N/A'}`);
    console.log(`Contact Person: ${po.supplier.contactPerson || 'N/A'}`);
    console.log(`Total Amount: ${po.totalAmount}`);
    console.log(`Items:`);

    po.items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.product.name} - Qty: ${item.quantityOrdered} @ ${item.unitCost}`);
    });

    console.log('========================================');

    // Simulate successful send
    // In production, return actual success/failure from email/webhook service
    return {
        success: true,
        method: 'stub',
        message: `PO #${po.poNumber} logged (no real email sent in stub mode)`,
    };
}

/**
 * Send notification when shipment is received (STUB)
 */
export async function notifySupplierShipmentReceived(
    po: PurchaseOrderWithDetails,
    receivedItems: Array<{ productName: string; quantityReceived: number }>
): Promise<void> {
    console.log('========================================');
    console.log('[STUB] Notifying Supplier: Shipment Received');
    console.log('========================================');
    console.log(`PO Number: ${po.poNumber}`);
    console.log(`Supplier: ${po.supplier.name}`);
    console.log('Received Items:');

    receivedItems.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.productName} - Qty Received: ${item.quantityReceived}`);
    });

    console.log('========================================');
}

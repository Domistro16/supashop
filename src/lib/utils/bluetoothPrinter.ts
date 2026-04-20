/**
 * Web Bluetooth ESC/POS printer utility.
 *
 * Targets consumer 58mm / 80mm Bluetooth thermal printers (Xprinter, Goojprt,
 * Munbyn, generic "BLE POS" devices) that expose a writable characteristic
 * under service 000018f0-*. We scan broadly for any writable characteristic as
 * a fallback because vendor UUIDs vary.
 *
 * Web Bluetooth is only available in Chromium-based browsers over HTTPS
 * (or localhost). Safari / iOS do not support it natively.
 */

// Primary GATT service used by most no-name Chinese BT thermal printers.
const PRIMARY_SERVICE = 0x18f0;
const PRIMARY_WRITE_CHAR = 0x2af1;

export type PrinterWidth = 32 | 42 | 48;

export type ReceiptPayload = {
    shopName: string;
    shopAddress?: string;
    shopPhone?: string;
    orderId: string;
    cashier?: string;
    customerName?: string;
    items: { name: string; quantity: number; unitPrice: number; lineTotal: number }[];
    total: number;
    amountPaid?: number;
    outstandingBalance?: number;
    footer?: string;
    printedAt?: Date;
    width?: PrinterWidth;
};

// ESC/POS control bytes
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

function bytes(...arr: number[]) {
    return new Uint8Array(arr);
}

function concat(chunks: Uint8Array[]): Uint8Array {
    const total = chunks.reduce((n, c) => n + c.byteLength, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
        out.set(c, offset);
        offset += c.byteLength;
    }
    return out;
}

function textBytes(s: string): Uint8Array {
    // ESC/POS printers accept plain ASCII reliably. We strip characters a
    // thermal printer can't render (emoji, box-drawing) to avoid garbled output.
    const clean = s.replace(/[^\x20-\x7E\n]/g, '');
    return new TextEncoder().encode(clean);
}

function alignLeft() { return bytes(ESC, 0x61, 0x00); }
function alignCenter() { return bytes(ESC, 0x61, 0x01); }
function boldOn() { return bytes(ESC, 0x45, 0x01); }
function boldOff() { return bytes(ESC, 0x45, 0x00); }
function doubleSize() { return bytes(GS, 0x21, 0x11); }
function normalSize() { return bytes(GS, 0x21, 0x00); }
function init() { return bytes(ESC, 0x40); }
function feedLines(n: number) { return bytes(ESC, 0x64, n); }
function cutPaper() { return bytes(GS, 0x56, 0x42, 0x00); }
function newline() { return bytes(LF); }

function padRight(s: string, width: number): string {
    if (s.length >= width) return s.slice(0, width);
    return s + ' '.repeat(width - s.length);
}

function padLeft(s: string, width: number): string {
    if (s.length >= width) return s.slice(0, width);
    return ' '.repeat(width - s.length) + s;
}

function formatNaira(n: number): string {
    // Avoid NGN symbol — many thermal printers don't have that glyph.
    return 'N' + Math.round(n).toLocaleString('en-US');
}

function buildReceipt(payload: ReceiptPayload): Uint8Array {
    const width = payload.width ?? 32;
    const chunks: Uint8Array[] = [];
    const push = (b: Uint8Array) => chunks.push(b);
    const line = (s: string) => push(textBytes(s + '\n'));

    push(init());

    push(alignCenter());
    push(doubleSize());
    line(payload.shopName.toUpperCase());
    push(normalSize());
    if (payload.shopAddress) line(payload.shopAddress);
    if (payload.shopPhone) line('Tel: ' + payload.shopPhone);
    line('-'.repeat(width));

    push(alignLeft());
    const date = (payload.printedAt || new Date()).toLocaleString('en-NG', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
    line(padRight('Ord #' + payload.orderId, width - date.length) + date);
    if (payload.cashier) line('Cashier: ' + payload.cashier);
    if (payload.customerName) line('Cust: ' + payload.customerName);
    line('-'.repeat(width));

    const qtyCol = 4;
    const priceCol = 10;
    const nameCol = width - qtyCol - priceCol;

    line(
        padRight('Item', nameCol) +
        padLeft('Qty', qtyCol) +
        padLeft('Amt', priceCol)
    );
    line('-'.repeat(width));

    for (const item of payload.items) {
        const nameLine = padRight(item.name, nameCol);
        const qtyLine = padLeft(String(item.quantity), qtyCol);
        const amtLine = padLeft(formatNaira(item.lineTotal), priceCol);
        line(nameLine + qtyLine + amtLine);
    }

    line('-'.repeat(width));
    push(boldOn());
    line(padRight('TOTAL', width - 12) + padLeft(formatNaira(payload.total), 12));
    push(boldOff());

    if (typeof payload.amountPaid === 'number' && payload.amountPaid > 0) {
        line(padRight('Paid', width - 12) + padLeft(formatNaira(payload.amountPaid), 12));
    }
    if (typeof payload.outstandingBalance === 'number' && payload.outstandingBalance > 0) {
        line(padRight('Balance', width - 12) + padLeft(formatNaira(payload.outstandingBalance), 12));
    }

    line('-'.repeat(width));
    push(alignCenter());
    line(payload.footer || 'Thank you for your patronage');
    line('Powered by Supashop');

    push(feedLines(3));
    push(cutPaper());

    return concat(chunks);
}

async function findWritableCharacteristic(device: any): Promise<any> {
    const server = await device.gatt.connect();

    // Fast path: the well-known service most consumer BT printers expose.
    try {
        const service = await server.getPrimaryService(PRIMARY_SERVICE);
        const char = await service.getCharacteristic(PRIMARY_WRITE_CHAR);
        if (char.properties.write || char.properties.writeWithoutResponse) return char;
    } catch {
        // fall through to scan
    }

    const services = await server.getPrimaryServices();
    for (const svc of services) {
        const chars = await svc.getCharacteristics();
        for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) return c;
        }
    }
    throw new Error('No writable characteristic found on this printer');
}

async function writeChunked(
    characteristic: any,
    data: Uint8Array,
    chunkSize = 180
): Promise<void> {
    // BLE MTU caps packet size around 20–512 bytes. 180 is a safe default for
    // the cheap printers this targets.
    for (let i = 0; i < data.byteLength; i += chunkSize) {
        const slice = data.slice(i, i + chunkSize);
        if (characteristic.properties.writeWithoutResponse) {
            await characteristic.writeValueWithoutResponse(slice);
        } else {
            await characteristic.writeValueWithResponse(slice);
        }
    }
}

export function isBluetoothPrintingSupported(): boolean {
    return typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;
}

export async function printReceiptViaBluetooth(payload: ReceiptPayload): Promise<void> {
    if (!isBluetoothPrintingSupported()) {
        throw new Error('Web Bluetooth not supported in this browser');
    }
    const device = await (navigator as any).bluetooth.requestDevice({
        // acceptAllDevices requires optionalServices to be listed explicitly.
        acceptAllDevices: true,
        optionalServices: [PRIMARY_SERVICE, 0xff00, 0xff12, 0x18f0],
    });

    try {
        const characteristic = await findWritableCharacteristic(device);
        const data = buildReceipt(payload);
        await writeChunked(characteristic, data);
    } finally {
        try {
            device.gatt?.disconnect();
        } catch {
            // ignore disconnect errors — printer may auto-disconnect
        }
    }
}

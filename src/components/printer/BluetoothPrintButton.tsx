import { useState } from 'react';
import { Bluetooth } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    isBluetoothPrintingSupported,
    printReceiptViaBluetooth,
    type ReceiptPayload,
} from '@/lib/utils/bluetoothPrinter';

type Props = {
    buildPayload: () => ReceiptPayload;
    className?: string;
    label?: string;
};

export default function BluetoothPrintButton({
    buildPayload,
    className,
    label = 'Print via Bluetooth',
}: Props) {
    const [isPrinting, setIsPrinting] = useState(false);

    const handlePrint = async () => {
        if (!isBluetoothPrintingSupported()) {
            toast.error(
                'Bluetooth printing needs Chrome or Edge on Android/Desktop. iOS is not supported yet.'
            );
            return;
        }

        setIsPrinting(true);
        const toastId = toast.loading('Pairing with printer…');
        try {
            const payload = buildPayload();
            await printReceiptViaBluetooth(payload);
            toast.success('Receipt sent to printer', { id: toastId });
        } catch (err: any) {
            const msg = err?.message || 'Printing failed';
            if (msg.includes('cancelled') || msg.includes('User cancelled')) {
                toast.dismiss(toastId);
            } else {
                toast.error(msg, { id: toastId });
            }
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className={
                className ||
                'inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/[0.08] text-sm font-medium disabled:opacity-60'
            }
        >
            <Bluetooth className="w-4 h-4 mr-2" />
            {isPrinting ? 'Printing…' : label}
        </button>
    );
}

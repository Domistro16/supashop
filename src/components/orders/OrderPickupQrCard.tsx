'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Loader2 } from 'lucide-react';
import { buildOrderPickupCode } from '@/lib/utils/orderPickupCode';

interface OrderPickupQrCardProps {
  saleId: string;
  orderId: string;
}

export default function OrderPickupQrCard({ saleId, orderId }: OrderPickupQrCardProps) {
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    QRCode.toDataURL(buildOrderPickupCode({ saleId, orderId }), {
      margin: 1,
      width: 216,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#111827',
        light: '#FFFFFF',
      },
    })
      .then((url: string) => {
        if (active) setQrSrc(url);
      })
      .catch(() => {
        if (active) setQrSrc(null);
      });

    return () => {
      active = false;
    };
  }, [orderId, saleId]);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 sm:p-6 mb-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <QrCode className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pickup QR</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Show this QR to the shop staff so they can scan and open your order instantly.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-5">
        {qrSrc ? (
          <img
            src={qrSrc}
            alt={`Pickup QR for order ${orderId}`}
            className="h-52 w-52 max-w-full rounded-lg bg-white p-3 shadow-sm"
          />
        ) : (
          <div className="h-52 w-52 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-white">Order #{orderId}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Staff can also enter the order reference manually if scanning is unavailable.
          </p>
        </div>
      </div>
    </div>
  );
}

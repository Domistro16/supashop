import { prisma } from '@/lib/prisma';
import { CheckCircle, Clock, XCircle, ArrowLeft, Package, CreditCard, MapPin } from 'lucide-react';
import { notFound } from 'next/navigation';
import UploadReceiptForm from './UploadReceiptForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PageProps {
    params: Promise<{ shopName: string; orderId: string }>;
}

export default async function OrderPage({ params }: PageProps) {
    const { shopName, orderId } = await params;

    const sale = await prisma.sale.findUnique({
        where: { id: orderId },
        include: {
            shop: true,
            saleItems: { include: { product: true } }
        }
    });

    if (!sale) return notFound();

    const getStatusDisplay = (status: string) => {
        switch (status) {
            case 'payment_pending':
                return { icon: Clock, text: 'Payment Required', variant: 'destructive' as const, bgColor: 'bg-orange-50 dark:bg-orange-900/20', borderColor: 'border-orange-200 dark:border-orange-800' };
            case 'payment_review':
                return { icon: Clock, text: 'Verifying Payment', variant: 'secondary' as const, bgColor: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-200 dark:border-blue-800' };
            case 'ready_for_collection':
                return { icon: Package, text: 'Ready for Collection', variant: 'default' as const, bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-200 dark:border-green-800' };
            case 'completed':
                return { icon: CheckCircle, text: 'Completed', variant: 'default' as const, bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-200 dark:border-green-800' };
            case 'cancelled':
                return { icon: XCircle, text: 'Cancelled', variant: 'destructive' as const, bgColor: 'bg-red-50 dark:bg-red-900/20', borderColor: 'border-red-200 dark:border-red-800' };
            default:
                return { icon: Clock, text: 'Processing', variant: 'secondary' as const, bgColor: 'bg-gray-50 dark:bg-gray-800', borderColor: 'border-gray-200 dark:border-gray-700' };
        }
    };

    const status = getStatusDisplay(sale.orderStatus);
    const StatusIcon = status.icon;

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* Back Button */}
            <Button variant="ghost" className="mb-6 pl-0 hover:bg-transparent hover:underline dark:text-gray-300" asChild>
                <Link href="/orders">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Orders
                </Link>
            </Button>

            {/* Status Card */}
            <div className={`p-6 sm:p-8 rounded-2xl text-center mb-6 border ${status.bgColor} ${status.borderColor}`}>
                <div className="w-16 h-16 mx-auto rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center mb-4">
                    <StatusIcon className={`w-8 h-8 ${status.variant === 'destructive' ? 'text-orange-500' :
                            status.variant === 'secondary' ? 'text-blue-500' : 'text-green-500'
                        }`} />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold mb-2 text-gray-900 dark:text-white">{status.text}</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm sm:text-base">Order #{sale.orderId}</p>
                <Badge variant={status.variant} className="text-sm px-4 py-1">
                    {sale.orderStatus.replace('_', ' ').toUpperCase()}
                </Badge>
            </div>

            {/* Payment Section */}
            {sale.orderStatus === 'payment_pending' && (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 sm:p-6 mb-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Payment Instructions</h2>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-5 text-sm">
                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                            Please transfer <strong className="text-blue-600 dark:text-blue-400">{formatPrice(Number(sale.totalAmount))}</strong> to:
                        </p>
                        <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                            <p className="font-semibold text-gray-900 dark:text-white">{sale.shop.name} Bank</p>
                            <p className="text-gray-600 dark:text-gray-300 font-mono mt-1">ACC: 1234567890</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                            Use Order <strong>#{sale.orderId}</strong> as payment reference
                        </p>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                        <h3 className="text-sm font-semibold mb-4 text-gray-900 dark:text-white">Upload Payment Receipt</h3>
                        <UploadReceiptForm orderId={sale.id} shopName={shopName} />
                    </div>
                </div>
            )}

            {/* Collection Info */}
            {sale.orderStatus === 'ready_for_collection' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 sm:p-6 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ready for Collection</h2>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                        Your order is ready! Please visit <strong>{sale.shop.name}</strong> to collect your items.
                    </p>
                    {sale.shop.address && (
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">{sale.shop.address}</p>
                    )}
                </div>
            )}

            {/* Order Items */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Order Items</h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(sale.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            })}
                        </span>
                    </div>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {sale.saleItems.map(item => (
                        <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">{item.product.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Qty: {item.quantity} × {formatPrice(Number(item.price))}
                                </p>
                            </div>
                            <p className="font-medium text-gray-900 dark:text-white">
                                {formatPrice(Number(item.price) * item.quantity)}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="font-bold text-gray-900 dark:text-white">Total</span>
                    <span className="font-bold text-xl text-blue-600 dark:text-blue-400">
                        {formatPrice(Number(sale.totalAmount))}
                    </span>
                </div>
            </div>
        </div>
    );
}

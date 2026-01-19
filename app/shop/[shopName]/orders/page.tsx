'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Clock, CheckCircle, ShoppingBag, LogIn, ArrowRight, XCircle } from 'lucide-react';

interface Order {
    id: string;
    orderId: string;
    totalAmount: number;
    orderStatus: string;
    createdAt: string;
    saleItems: { quantity: number; product: { name: string } }[];
}

export default function MyOrdersPage() {
    const { shopName } = useParams();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('customer_token');

        if (!token) {
            setIsLoading(false);
            return;
        }

        setIsAuthenticated(true);

        fetch(`/api/customer/orders?shopName=${shopName}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) {
                    setOrders(data.orders || []);
                }
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [shopName]);

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'payment_pending':
                return { icon: Clock, text: 'Payment Pending', variant: 'destructive' as const, color: 'text-orange-500' };
            case 'payment_review':
                return { icon: Clock, text: 'Under Review', variant: 'secondary' as const, color: 'text-blue-500' };
            case 'ready_for_collection':
                return { icon: CheckCircle, text: 'Ready for Pickup', variant: 'default' as const, color: 'text-green-500' };
            case 'completed':
                return { icon: CheckCircle, text: 'Completed', variant: 'default' as const, color: 'text-green-600' };
            case 'cancelled':
                return { icon: XCircle, text: 'Cancelled', variant: 'destructive' as const, color: 'text-red-500' };
            default:
                return { icon: Clock, text: status, variant: 'secondary' as const, color: 'text-gray-500' };
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="text-center py-16 sm:py-20 flex flex-col items-center px-4">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                    <LogIn className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sign in to view orders</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Track your order history and status</p>
                <div className="flex gap-3">
                    <Button asChild size="lg">
                        <Link href="/signin">
                            <LogIn className="w-4 h-4 mr-2" />
                            Sign In
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="dark:border-gray-600">
                        <Link href="/signup">Create Account</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Orders</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                    </p>
                </div>
                <Button variant="outline" asChild className="dark:border-gray-600">
                    <Link href="/">
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Continue Shopping</span>
                        <span className="sm:hidden">Shop</span>
                    </Link>
                </Button>
            </div>

            {orders.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No orders yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Your order history will appear here</p>
                    <Button asChild>
                        <Link href="/">
                            <ShoppingBag className="w-4 h-4 mr-2" />
                            Start Shopping
                        </Link>
                    </Button>
                </div>
            ) : (
                <div className="space-y-3 sm:space-y-4">
                    {orders.map(order => {
                        const status = getStatusConfig(order.orderStatus);
                        const StatusIcon = status.icon;

                        return (
                            <Link
                                key={order.id}
                                href={`/order/${order.id}`}
                                className="block bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 ${status.color}`}>
                                            <StatusIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                                                Order #{order.orderId}
                                            </p>
                                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                                {new Date(order.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                                                {order.saleItems.length} item{order.saleItems.length > 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right flex-shrink-0">
                                        <Badge variant={status.variant} className="mb-2">{status.text}</Badge>
                                        <p className="font-bold text-blue-600 dark:text-blue-400 text-sm sm:text-base">
                                            {formatPrice(order.totalAmount)}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">View details</span>
                                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

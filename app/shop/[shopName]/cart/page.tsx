'use client';
import { useCart } from '../../_context/CartContext';
import { Trash2, ArrowRight, Minus, Plus, User, LogIn, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function CartPage() {
    const { items, removeItem, updateQuantity, total, clearCart } = useCart();
    const { shopName } = useParams();
    const router = useRouter();

    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [customerInfo, setCustomerInfo] = useState<{ id: string; name: string; email: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Payment info state
    const [paymentType, setPaymentType] = useState<'full' | 'installment'>('full');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card'>('bank_transfer');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [initialPayment, setInitialPayment] = useState<number | ''>('');

    useEffect(() => {
        const token = localStorage.getItem('customer_token');
        const customerId = localStorage.getItem('customer_id');

        if (token && customerId) {
            fetch(`/api/auth/customer/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data) {
                        setCustomerInfo(data.customer);
                        setIsAuthenticated(true);
                    }
                })
                .catch(() => { })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) return;

        if (!isAuthenticated || !customerInfo) {
            toast.error('Please sign in to place an order');
            router.push('/signin');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('customer_token');
            const response = await fetch('/api/sales/online', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    shopName,
                    items: items.map(i => ({ productId: i.id, quantity: i.quantity, price: i.price })),
                    customerId: customerInfo.id,
                    note,
                    paymentType,
                    paymentMethod,
                    bankName: paymentMethod === 'bank_transfer' ? bankName : null,
                    accountNumber: paymentMethod === 'bank_transfer' ? accountNumber : null,
                    amountPaid: paymentType === 'installment' ? initialPayment : 0,
                }),
            });

            if (!response.ok) throw new Error('Failed to place order');

            const data = await response.json();

            clearCart();
            toast.success('Order placed successfully!');
            router.push(`/order/${data.orderId}`);
        } catch (error) {
            console.error(error);
            toast.error('Failed to place order. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_id');
        setIsAuthenticated(false);
        setCustomerInfo(null);
        toast.success('Signed out');
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

    if (items.length === 0) {
        return (
            <div className="text-center py-20 flex flex-col items-center px-4">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Looks like you haven't added anything yet.</p>
                <Button asChild>
                    <Link href="/">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Continue Shopping
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8">Shopping Cart</h1>

            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                {/* Cart Items */}
                <div className="flex-1 space-y-3 sm:space-y-4">
                    {items.map((item) => (
                        <div key={item.id} className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex gap-3 sm:gap-4 items-start sm:items-center">
                                {/* Product Image Placeholder */}
                                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center">
                                    <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500" />
                                </div>

                                {/* Product Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                                        {item.name}
                                    </h3>
                                    <p className="text-blue-600 dark:text-blue-400 font-medium text-sm mt-1">
                                        {formatPrice(item.price)}
                                    </p>

                                    {/* Mobile: Quantity & Delete */}
                                    <div className="flex items-center justify-between mt-3 sm:hidden">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 rounded-full dark:border-gray-600"
                                                onClick={() => updateQuantity(item.id, -1)}
                                            >
                                                <Minus className="w-3 h-3" />
                                            </Button>
                                            <span className="w-8 text-center text-sm font-medium dark:text-white">{item.quantity}</span>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 rounded-full dark:border-gray-600"
                                                onClick={() => updateQuantity(item.id, 1)}
                                            >
                                                <Plus className="w-3 h-3" />
                                            </Button>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeItem(item.id)}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Desktop: Quantity Controls */}
                                <div className="hidden sm:flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-full dark:border-gray-600"
                                        onClick={() => updateQuantity(item.id, -1)}
                                    >
                                        <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="w-6 text-center text-sm font-medium dark:text-white">{item.quantity}</span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-full dark:border-gray-600"
                                        onClick={() => updateQuantity(item.id, 1)}
                                    >
                                        <Plus className="w-3 h-3" />
                                    </Button>
                                </div>

                                {/* Desktop: Delete Button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeItem(item.id)}
                                    className="hidden sm:flex text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Order Summary - Fixed width on desktop */}
                <div className="w-full lg:w-80 flex-shrink-0">
                    <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm lg:sticky lg:top-24">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Order Summary</h3>

                        {/* Totals */}
                        <div className="space-y-3 mb-6 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-400">
                                    Subtotal ({items.reduce((a, b) => a + b.quantity, 0)} items)
                                </span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {formatPrice(total)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-base sm:text-lg font-bold pt-3 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-gray-900 dark:text-white">Total</span>
                                <span className="text-blue-600 dark:text-blue-400">{formatPrice(total)}</span>
                            </div>
                        </div>

                        {/* Authentication Section */}
                        {!isAuthenticated ? (
                            <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">Sign in to continue</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Track your orders easily</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button asChild className="flex-1" size="sm">
                                        <Link href="/signin">
                                            <LogIn className="w-4 h-4 mr-1" />
                                            Sign In
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline" className="flex-1 dark:border-gray-600" size="sm">
                                        <Link href="/signup">Sign Up</Link>
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-5 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{customerInfo?.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{customerInfo?.email}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 dark:text-gray-400 flex-shrink-0 px-2">
                                        Logout
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Payment Options */}
                        <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Payment Options</h4>

                            {/* Payment Type Toggle */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    type="button"
                                    onClick={() => setPaymentType('full')}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${paymentType === 'full'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                                        }`}
                                >
                                    Full Payment
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentType('installment')}
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${paymentType === 'installment'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                                        }`}
                                >
                                    Installment
                                </button>
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-2 mb-4">
                                <Label className="text-gray-700 dark:text-gray-300">Payment Method</Label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank_transfer' | 'card')}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                </select>
                            </div>

                            {/* Bank Details (for bank transfer) */}
                            {paymentMethod === 'bank_transfer' && (
                                <div className="space-y-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <div className="space-y-1">
                                        <Label className="text-gray-700 dark:text-gray-300 text-xs">Bank Name</Label>
                                        <input
                                            type="text"
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value)}
                                            placeholder="e.g. GTBank, Access Bank"
                                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-gray-700 dark:text-gray-300 text-xs">Account Number (Optional)</Label>
                                        <input
                                            type="text"
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value)}
                                            placeholder="e.g. 0123456789"
                                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Initial Payment for Installment */}
                            {paymentType === 'installment' && (
                                <div className="mt-4 space-y-2">
                                    <Label className="text-gray-700 dark:text-gray-300">Initial Payment Amount</Label>
                                    <input
                                        type="number"
                                        value={initialPayment}
                                        onChange={(e) => setInitialPayment(e.target.value ? Number(e.target.value) : '')}
                                        placeholder="Enter initial payment"
                                        max={total}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                    {initialPayment && (
                                        <p className="text-xs text-orange-600 dark:text-orange-400">
                                            Outstanding balance: {formatPrice(total - Number(initialPayment))}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Order Note */}
                        <form onSubmit={handleSubmitOrder} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="note" className="text-gray-700 dark:text-gray-300">Order Note (Optional)</Label>
                                <textarea
                                    id="note"
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    className="flex min-h-[70px] w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="Any special instructions..."
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                disabled={isSubmitting || !isAuthenticated}
                            >
                                {isSubmitting ? 'Placing Order...' : 'Place Order'}
                            </Button>

                            {!isAuthenticated && (
                                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                                    Please sign in to place your order
                                </p>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

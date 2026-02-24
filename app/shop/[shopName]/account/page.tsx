'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, LogOut, Package, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Customer {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
}

export default function ProfilePage() {
    const router = useRouter();
    const { shopName } = useParams();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('customer_token');
            if (!token) {
                router.push(`/shop/${shopName}/signin`);
                return;
            }

            try {
                const res = await fetch('/api/auth/customer/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) {
                    if (res.status === 401) {
                        localStorage.removeItem('customer_token');
                        localStorage.removeItem('customer_id');
                        router.push(`/shop/${shopName}/signin`);
                    }
                    throw new Error('Failed to fetch profile');
                }

                const data = await res.json();
                setCustomer(data.customer); // Assuming API returns { customer: ... }
            } catch (error) {
                console.error(error);
                // toast.error('Could not load profile');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_id');
        toast.success('Logged out successfully');
        router.push(`/shop/${shopName}/signin`);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (!customer) return null;

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">My Profile</h1>

            {/* Profile Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
                <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {customer.name?.[0]?.toUpperCase() || <User className="w-10 h-10" />}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                {customer.name || 'Valued Customer'}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Customer Account</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Email Address</p>
                                <p className="font-medium text-gray-900 dark:text-white">{customer.email || 'Not provided'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                            <Phone className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Phone Number</p>
                                <p className="font-medium text-gray-900 dark:text-white">{customer.phone || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between">
                    <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href={`/shop/${shopName}/orders`} className="block p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors group">
                    <Package className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">My Orders</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and view your order history</p>
                </Link>
            </div>
        </div>
    );
}

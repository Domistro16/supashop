import { ReactNode } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ShoppingCart, Store, User, Package } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { CartProvider } from '../_context/CartContext';
import { Toaster } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import ThemeToggle from '../_components/ThemeToggle';

interface ShopLayoutProps {
    children: ReactNode;
    params: Promise<{ shopName: string }>;
}

export async function generateMetadata({ params }: ShopLayoutProps): Promise<Metadata> {
    const { shopName } = await params;

    const shop = await prisma.shop.findFirst({
        where: {
            OR: [
                { name: { equals: shopName, mode: 'insensitive' } },
                { name: { equals: shopName.replace(/-/g, ' '), mode: 'insensitive' } }
            ]
        },
        select: {
            name: true,
        }
    });

    if (!shop) {
        return {
            title: 'Shop Not Found',
        };
    }

    return {
        title: `${shop.name} - SupaShop`,
        description: `Welcome to ${shop.name} on SupaShop`,
    };
}

export default async function ShopLayout({
    children,
    params,
}: ShopLayoutProps) {
    const { shopName } = await params;

    const shop = await prisma.shop.findFirst({
        where: {
            OR: [
                { name: { equals: shopName, mode: 'insensitive' } },
                { name: { equals: shopName.replace(/-/g, ' '), mode: 'insensitive' } }
            ]
        },
        select: {
            id: true,
            name: true,
            address: true,
            isStorefrontEnabled: true
        }
    });

    if (!shop) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center space-y-4 px-4">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                        <Store className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shop Not Found</h1>
                    <p className="text-gray-500 dark:text-gray-400">The shop "{shopName}" does not exist.</p>
                </div>
            </div>
        );
    }

    if (!shop.isStorefrontEnabled) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center space-y-4 px-4">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
                        <Store className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store currently offline</h1>
                    <p className="text-gray-500 dark:text-gray-400">{shop.name} is currently undergoing maintenance. Please check back later.</p>
                </div>
            </div>
        );
    }

    return (
        <CartProvider shopName={shop.name}>
            <script
                dangerouslySetInnerHTML={{
                    __html: `
                        (function() {
                            try {
                                var stored = localStorage.getItem('storefront-theme');
                                if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                                    document.documentElement.classList.add('dark');
                                } else {
                                    document.documentElement.classList.remove('dark');
                                }
                            } catch (e) {}
                        })()
                    `,
                }}
            />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans transition-colors">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
                    <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
                        {/* Logo */}
                        <Link href={`/shop/${shopName}`} className="flex items-center gap-2 group">
                            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-1.5 sm:p-2 rounded-lg group-hover:from-blue-700 group-hover:to-blue-800 transition-all shadow-sm">
                                <Store className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white text-base sm:text-lg truncate max-w-[120px] sm:max-w-none">
                                {shop.name}
                            </span>
                        </Link>

                        {/* Navigation Icons */}
                        <div className="flex items-center gap-1 sm:gap-2">
                            {/* Theme Toggle */}
                            <ThemeToggle />

                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full h-9 w-9 sm:h-10 sm:w-10 hover:bg-gray-100 dark:hover:bg-gray-700"
                                asChild
                            >
                                <Link href={`/shop/${shopName}/orders`} title="My Orders">
                                    <Package className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                </Link>
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full h-9 w-9 sm:h-10 sm:w-10 hover:bg-gray-100 dark:hover:bg-gray-700"
                                asChild
                            >
                                <Link href={`/shop/${shopName}/account`} title="Account">
                                    <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                </Link>
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full h-9 w-9 sm:h-10 sm:w-10 hover:bg-gray-100 dark:hover:bg-gray-700 relative"
                                asChild
                            >
                                <Link href={`/shop/${shopName}/cart`}>
                                    <ShoppingCart className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
                    {children}
                </main>

                {/* Footer */}
                <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 sm:py-8 mt-auto">
                    <div className="container mx-auto px-4 text-center space-y-2">
                        <p className="font-semibold text-gray-900 dark:text-white">{shop.name}</p>
                        {shop.address && (
                            <p className="text-gray-500 dark:text-gray-400 text-sm">{shop.address}</p>
                        )}
                        <div className="pt-4 text-xs text-gray-400 dark:text-gray-500">
                            &copy; {new Date().getFullYear()} • Powered by{' '}
                            <span className="font-semibold text-blue-600 dark:text-blue-400">SupaShop</span>
                        </div>
                    </div>
                </footer>

                <Toaster
                    position="bottom-right"
                    toastOptions={{
                        className: 'dark:bg-gray-800 dark:text-white',
                    }}
                />
            </div>
        </CartProvider>
    )
}

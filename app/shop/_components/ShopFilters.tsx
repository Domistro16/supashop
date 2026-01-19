'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce'; // Create this simple hook if missing, or implement standard debounce

export default function ShopFilters({
    categories,
    activeCategory
}: {
    categories: string[],
    activeCategory?: string
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (searchTerm) {
                params.set('search', searchTerm);
            } else {
                params.delete('search');
            }
            router.replace(`?${params.toString()}`);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, router, searchParams]);

    const handleCategoryClick = (category: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (category === 'all') {
            params.delete('category');
        } else {
            params.set('category', category);
        }
        router.replace(`?${params.toString()}`);
    };

    const clearFilters = () => {
        setSearchTerm('');
        router.replace('/');
    };

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-200"></div>
                <div className="relative flex shadow-xl">
                    <div className="relative flex-grow">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="What are you looking for?"
                            className="w-full h-14 pl-12 pr-4 bg-white dark:bg-gray-800 rounded-2xl border-0 ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder:text-gray-400 text-lg transition-shadow"
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Categories (Horizontal Scroll) */}
            <div className="md:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    onClick={() => handleCategoryClick('all')}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${!activeCategory || activeCategory === 'all'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                        }`}
                >
                    All Products
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => handleCategoryClick(cat)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Desktop Sidebar (Rendered inside parent usually, but logic here helps) 
                Actually, let's keep the desktop sidebar in the parent but controlled by links or this component?
                Links are better for SEO. The form was submitting properly, but maybe standard HTML form behavior is clashing.
                Client filtering is better for UX anyway.
            */}
        </div>
    );
}

export function DesktopCategorySidebar({
    categories,
    activeCategory
}: {
    categories: string[],
    activeCategory?: string
}) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleCategoryClick = (category: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (category === 'all') {
            params.delete('category');
        } else {
            params.set('category', category);
        }
        router.replace(`?${params.toString()}`);
    };

    return (
        <div className="w-full md:w-64 flex-shrink-0 space-y-8">
            <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Categories
                </h3>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => handleCategoryClick('all')}
                        className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${!activeCategory || activeCategory === 'all'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                    >
                        All Products
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => handleCategoryClick(cat)}
                            className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${activeCategory === cat
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

import { prisma } from '@/lib/prisma';
import ProductCard from '../_components/ProductCard';
import ShopFilters, { DesktopCategorySidebar } from '../_components/ShopFilters';
import { notFound } from 'next/navigation';
import { Search, Sparkles, ShoppingBag, Filter, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PageProps {
    params: Promise<{ shopName: string }>;
    searchParams: Promise<{ category?: string; search?: string }>;
}

export default async function ShopPage({ params, searchParams }: PageProps) {
    const { shopName } = await params;
    const { category, search } = await searchParams;

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
            heroTitle: true,
            heroSubtitle: true,
            primaryColor: true
        }
    });

    if (!shop) return notFound();

    // Stats
    const allProductsCount = await prisma.product.count({
        where: { shopId: shop.id, stock: { gt: 0 } }
    });

    // Categories
    const categories = await prisma.product.findMany({
        where: { shopId: shop.id, stock: { gt: 0 } },
        select: { categoryName: true },
        distinct: ['categoryName']
    });

    const uniqueCategories = categories
        .map(c => c.categoryName)
        .filter((c): c is string => c !== null);

    // Products query
    const whereClause: any = {
        shopId: shop.id,
        stock: { gt: 0 },
    };

    if (category && category !== 'all') {
        whereClause.categoryName = category;
    }

    if (search) {
        whereClause.name = { contains: search, mode: 'insensitive' };
    }

    const products = await prisma.product.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
    });

    // Featured Products
    const featuredProducts = await prisma.product.findMany({
        where: {
            shopId: shop.id,
            stock: { gt: 0 },
            isFeatured: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 4
    });

    const primaryColor = shop.primaryColor || 'blue';
    const colorMap: Record<string, string> = {
        blue: 'from-blue-600 to-purple-600',
        purple: 'from-purple-600 to-pink-600',
        emerald: 'from-emerald-600 to-teal-600',
        orange: 'from-orange-600 to-red-600',
        pink: 'from-pink-600 to-rose-600',
        neutral: 'from-gray-800 to-gray-600',
    };

    // Fallback for gradient classes
    const gradientClass = colorMap[primaryColor] || colorMap['blue'];
    const bgGradient = `bg-gradient-to-r ${gradientClass}`;

    // For text/accents that need a specific color class
    const accentColorMap: Record<string, string> = {
        blue: 'text-blue-400',
        purple: 'text-purple-400',
        emerald: 'text-emerald-400',
        orange: 'text-orange-400',
        pink: 'text-pink-400',
        neutral: 'text-gray-400',
    };
    const accentText = accentColorMap[primaryColor] || 'text-blue-400';
    const accentBorder = `border-${primaryColor}-500/30`; // Tailwind might not support dynamic classes like this fully without safelist, but standard colors usually work if safe listed or just mapped.
    // Better to map border too to be safe for JIT?
    // Actually simplicity:
    const pillClass = primaryColor === 'blue' ? 'bg-blue-600/20 text-blue-200 border-blue-500/30' :
        primaryColor === 'purple' ? 'bg-purple-600/20 text-purple-200 border-purple-500/30' :
            primaryColor === 'emerald' ? 'bg-emerald-600/20 text-emerald-200 border-emerald-500/30' :
                primaryColor === 'orange' ? 'bg-orange-600/20 text-orange-200 border-orange-500/30' :
                    primaryColor === 'pink' ? 'bg-pink-600/20 text-pink-200 border-pink-500/30' :
                        'bg-gray-600/20 text-gray-200 border-gray-500/30';

    return (
        <div className="space-y-8 pb-12">
            {/* Hero Section */}
            <section className="relative overflow-hidden rounded-3xl bg-gray-900 border border-gray-800 shadow-2xl">
                <div className={`absolute inset-0 ${bgGradient} opacity-20 z-0`}></div>
                <div className="absolute inset-0 opacity-[0.03] z-0"
                    style={{ backgroundImage: `url("data:image/svg+xml,...")` }}
                ></div>

                <div className="relative z-10 p-8 md:p-12 lg:p-16 text-center text-white">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 ${accentText} text-sm mb-6`}>
                        <Sparkles className="w-4 h-4" />
                        <span>Premium Shopping Experience</span>
                    </div>

                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            {shop.heroTitle || shop.name}
                        </span>
                    </h1>

                    <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        {shop.heroSubtitle || `Discover curated products at unbeatable prices.${shop.address ? ` Visit us at ${shop.address}.` : ''}`}
                    </p>

                    {/* Client-Side Search Bar */}
                    <ShopFilters categories={uniqueCategories} activeCategory={category} />

                    {/* Stats Pills */}
                    <div className="flex flex-wrap justify-center gap-4 mt-10">
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-6 py-2 text-sm text-gray-300 flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-blue-400" />
                            <span className="font-semibold text-white">{allProductsCount}</span> Products
                        </div>
                        {category && category !== 'all' && (
                            <div className={`${pillClass} backdrop-blur-sm border rounded-full px-6 py-2 text-sm flex items-center gap-2`}>
                                <Filter className="w-4 h-4" />
                                Filter: <span className="font-semibold text-white">{category}</span>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Featured Section */}
            {featuredProducts.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center gap-2">
                        <Star className={`w-6 h-6 ${accentText}`} />
                        <h2 className="text-2xl font-bold tracking-tight">Featured Collection</h2>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {featuredProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={{
                                    id: product.id,
                                    name: product.name,
                                    price: Number(product.price),
                                    categoryName: product.categoryName,
                                    stock: product.stock
                                }}
                            />
                        ))}
                    </div>
                </section>
            )}

            <div className="flex flex-col md:flex-row gap-8">
                {/* Desktop Sidebar */}
                <DesktopCategorySidebar categories={uniqueCategories} activeCategory={category} />

                {/* Main Content */}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {search ? `Results for "${search}"` : (category || 'All Products')}
                        </h2>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {products.length} found
                        </span>
                    </div>

                    {products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                            <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex items-center justify-center mb-6 ring-1 ring-gray-100 dark:ring-gray-700">
                                <Search className="w-10 h-10 text-gray-400 opacity-50" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                No products found
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">
                                Try adjusting your search or filters.
                            </p>
                            {(search || category) && (
                                <Button asChild variant="outline">
                                    <Link href={`/shop/${shopName}`} className="gap-2">
                                        <X className="w-4 h-4" />
                                        Clear Filters
                                    </Link>
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                            {products.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={{
                                        id: product.id,
                                        name: product.name,
                                        price: Number(product.price),
                                        categoryName: product.categoryName,
                                        stock: product.stock
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

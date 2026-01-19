'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus } from 'lucide-react';
import { useCart } from '../_context/CartContext';
import toast from 'react-hot-toast';

interface ProductCardProps {
    product: {
        id: string;
        name: string;
        price: number;
        stock: number;
        categoryName?: string | null;
    };
}

export default function ProductCard({ product }: ProductCardProps) {
    const { addItem } = useCart();
    const isOutOfStock = product.stock <= 0;

    const handleAddToCart = () => {
        if (isOutOfStock) return;

        addItem({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
        });
        toast.success(`${product.name} added to cart`);
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(price);
    };

    return (
        <div className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
            {/* Image Placeholder */}
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                    <ShoppingCart className="w-12 h-12 text-gray-300 dark:text-gray-600 group-hover:scale-110 transition-transform duration-300" />
                </div>

                {/* Out of Stock Overlay */}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Badge variant="destructive" className="text-sm px-3 py-1">
                            Out of Stock
                        </Badge>
                    </div>
                )}

                {/* Category Badge */}
                {product.categoryName && !isOutOfStock && (
                    <Badge
                        variant="secondary"
                        className="absolute top-3 left-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-xs"
                    >
                        {product.categoryName}
                    </Badge>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base leading-tight line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                </h3>

                <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-blue-600 dark:text-blue-400 font-bold text-base sm:text-lg">
                        {formatPrice(product.price)}
                    </p>

                    <Button
                        size="sm"
                        onClick={handleAddToCart}
                        disabled={isOutOfStock}
                        className="h-9 px-3 rounded-lg shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Add</span>
                    </Button>
                </div>

                {/* Stock indicator */}
                {!isOutOfStock && (
                    <div className="mt-3 flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${product.stock <= 5 ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} />
                        <p className={`text-xs ${product.stock <= 5 ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                            {product.stock} left in stock
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

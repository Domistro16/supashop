import { useState } from "react";
import { ShoppingCart, Package, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import QuickSell from "@/components/sales/QuickSell";

export type Product = {
  id: string;
  name: string;
  stock: number;
  price: string;
  created_at: string;
  category: string;
};

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
  isSelected?: boolean;
}

// Generate a consistent color based on category name
function getCategoryColor(category: string): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from product name (up to 2 characters)
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function ProductCard({ product, onSelect, isSelected }: ProductCardProps) {
  const [showQuickSell, setShowQuickSell] = useState(false);

  const formattedPrice = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(Number(product.price));

  const stockStatus = product.stock <= 0
    ? { label: "Out of Stock", color: "text-red-500 bg-red-50 dark:bg-red-900/20" }
    : product.stock <= 10
      ? { label: `${product.stock} left`, color: "text-orange-500 bg-orange-50 dark:bg-orange-900/20" }
      : { label: `${product.stock} in stock`, color: "text-green-600 bg-green-50 dark:bg-green-900/20" };

  const categoryColor = getCategoryColor(product.category);

  return (
    <>
      <div
        className={`relative bg-white dark:bg-white/[0.03] rounded-xl border transition-all duration-200 hover:shadow-md ${isSelected
          ? "border-blue-500 ring-2 ring-blue-500/20"
          : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
          }`}
        onClick={() => onSelect?.(product)}
      >
        {/* Product Visual Placeholder */}
        <div className={`relative h-28 sm:h-32 rounded-t-xl ${categoryColor} flex items-center justify-center overflow-hidden`}>
          {/* Pattern overlay for visual interest */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          {/* Product initials */}
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-3xl sm:text-4xl font-bold text-white drop-shadow-sm">
              {getInitials(product.name)}
            </span>
            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white/70 mt-1" />
          </div>

          {/* Actions dropdown */}
          <div className="absolute top-2 right-2 z-20">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 bg-white/20 hover:bg-white/40 text-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.id)}>
                  Copy ID
                </DropdownMenuItem>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Category badge */}
          <div className="absolute bottom-2 left-2 z-10">
            <span className="px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-200 rounded-full">
              {product.category}
            </span>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-3 sm:p-4">
          <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-2 mb-1.5">
            {product.name}
          </h3>

          <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2">
            {formattedPrice}
          </p>

          {/* Stock status */}
          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${stockStatus.color}`}>
            {stockStatus.label}
          </div>

          {/* Quick sell button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 h-8 text-xs sm:text-sm text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
            onClick={(e) => {
              e.stopPropagation();
              setShowQuickSell(true);
            }}
            disabled={product.stock <= 0}
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
            Quick Sell
          </Button>
        </div>
      </div>

      {showQuickSell && (
        <QuickSell
          product={product}
          onClose={() => setShowQuickSell(false)}
          onSuccess={() => {
            // Data is refreshed via context in QuickSell
          }}
        />
      )}
    </>
  );
}

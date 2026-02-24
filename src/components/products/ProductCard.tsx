import { useState } from "react";
import { ShoppingCart, Package, MoreVertical, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import QuickSell from "@/components/sales/QuickSell";
import { Modal } from "@/components/ui/modal/index";
import { products } from "@/lib/api";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import { useDataRefresh } from "@/context/DataRefreshContext";

export type Product = {
  id: string;
  name: string;
  stock: number;
  price: string;
  costPrice?: string;
  created_at: string;
  category: string;
};

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
  isSelected?: boolean;
}

const formSchema = z.object({
  product_name: z.string().min(2, {
    error: "Product name must be at least 2 characters.",
  }),
  category: z.string().min(2, {
    error: "Category name must be at least 2 characters.",
  }),
  stock: z.number().int().min(0, {
    error: "Stock must be at least 0",
  }),
  price: z.string().min(1, {
    error: "Price is required.",
  }),
  cost_price: z.string().min(1, {
    error: "Cost price is required.",
  }),
});

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
  const [showRestockModal, setShowRestockModal] = useState(false);
  const { refreshProducts } = useDataRefresh();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_name: product.name,
      category: product.category,
      stock: product.stock,
      price: product.price,
      cost_price: product.costPrice || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await products.update(product.id, {
        name: values.product_name,
        categoryName: values.category,
        stock: values.stock,
        price: parseFloat(values.price),
        costPrice: values.cost_price ? parseFloat(values.cost_price) : undefined,
      });
      toast.success("Product restocked successfully");
      setShowRestockModal(false);
      await refreshProducts();
    } catch (error) {
      console.error(error);
      toast.error("Failed to restock product");
    }
  }

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
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  setShowRestockModal(true);
                }}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restock
                </DropdownMenuItem>
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

      {/* Restock Modal */}
      <Modal isOpen={showRestockModal} onClose={() => setShowRestockModal(false)} className="max-w-2xl">
        <div className="p-6 lg:p-10 max-h-[80%] overflow-y-auto">
          <div className="flex flex-col px-2 overflow-y-auto max-h-[80%] custom-scrollbar">
            <div>
              <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
                Restock Product
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Update stock quantity and product details
              </p>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-5">
                <div className="flex w-full gap-5">
                  <FormField
                    control={form.control}
                    name="product_name"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter Product Name" {...field} className="w-full" />
                        </FormControl>
                        <FormDescription>This is the name of the product.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter Category" {...field} className="w-full" />
                        </FormControl>
                        <FormDescription>This is the category the product belongs to.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex w-full gap-5">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input placeholder="₦" {...field} className="w-full" />
                        </FormControl>
                        <FormDescription>The selling price.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cost_price"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Cost Price</FormLabel>
                        <FormControl>
                          <Input placeholder="₦" {...field} className="w-full" />
                        </FormControl>
                        <FormDescription>Used for profit calculation.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter stock quantity"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>The available stock for the product.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit">Save Changes</Button>
              </form>
            </Form>
          </div>
        </div>
      </Modal>
    </>
  );
}


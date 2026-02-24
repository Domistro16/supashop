"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";
import { products } from "@/lib/api";
import toast from "react-hot-toast";

import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal/index";
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
import { QuantityInput } from "./addProduct";
import QuickSell from "@/components/sales/QuickSell";

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Product = {
  id: string;
  name: string;
  stock: number;
  price: string;
  costPrice?: string;
  created_at: string;
  category: string;
  dealer?: string;
};

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
  price: z.string().min(2, {
    error: "Price must be at least 2 characters.",
  }),
  cost_price: z.string().optional(),
});

export const columns: ColumnDef<Product>[] = [
  // ... existing check box column ...
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-theme-xs"
        >
          Product
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "stock",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-theme-xs"
        >
          Stock
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "category",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-theme-xs"
        >
          Category
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "price",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-theme-xs"
        >
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("price"));
      const formatted = new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
      }).format(amount);

      return <div className="text-left font-medium">{formatted}</div>;
    },

  },
  {
    accessorKey: "costPrice",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-theme-xs text-gray-500"
        >
          Cost (Hidden)
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("costPrice") || "0");
      if (!amount) return <div className="text-left font-medium text-gray-400">-</div>;

      const formatted = new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
      }).format(amount);

      return <div className="text-left font-medium text-gray-500">{formatted}</div>;
    },
  },
  // ... rest of columns ...
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-theme-xs"
        >
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const timestamp = new Date(row.getValue("created_at"));
      console.log(timestamp);
      const formatted = new Intl.DateTimeFormat("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(timestamp as any);

      console.log(formatted); // e.g. "Sep 4, 2025, 1:34:56 PM GMT+1"
      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    id: "quick-sell",
    header: () => <div className="text-center">Quick Sell</div>,
    cell: ({ row }) => {
      const product = row.original;
      const [showQuickSell, setShowQuickSell] = useState(false);

      return (
        <>
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQuickSell(true)}
              className="h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Sell
            </Button>
          </div>
          {showQuickSell && (
            <QuickSell
              product={product}
              onClose={() => setShowQuickSell(false)}
              onSuccess={() => {
                // Data refreshed via context in QuickSell
              }}
            />
          )}
        </>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const product = row.original;
      const { openModal, isOpen, closeModal } = useModal();
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

      // Reset form when modal opens to ensure fresh data
      useEffect(() => {
        if (isOpen) {
          form.reset({
            product_name: product.name,
            category: product.category,
            stock: product.stock,
            price: product.price,
            cost_price: product.costPrice || "",
          });
        }
      }, [isOpen, product, form]);

      async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
          await products.update(product.id, {
            name: values.product_name,
            categoryName: values.category,
            stock: values.stock,
            price: parseFloat(values.price),
            costPrice: values.cost_price ? parseFloat(values.cost_price) : undefined,
          });
          toast.success("Product updated successfully");
          closeModal();
          // Optional: Refresh data logic here if creating a context or prop
          // Optional: Refresh data logic here if creating a context or prop
          // window.location.reload();
        } catch (error) {
          console.error(error);
          toast.error("Failed to update product");
        }
      }

      return (
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(product.id)}
              >
                Copy Product ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openModal()}>
                Restock
              </DropdownMenuItem>
              <DropdownMenuItem>Delete Product</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Modal isOpen={isOpen} onClose={closeModal} className="max-w-2xl">
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
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-8 mt-5"
                  >
                    <div className="flex w-full gap-5">
                      <FormField
                        control={form.control}
                        name="product_name"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Product Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter Product Name"
                                {...field}
                                className="w-full"
                              />
                            </FormControl>
                            <FormDescription>
                              This is the name of the product.
                            </FormDescription>
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
                              <Input
                                placeholder="Enter Category"
                                {...field}
                                className="w-full"
                              />
                            </FormControl>
                            <FormDescription>
                              This is the category the product belongs to.
                            </FormDescription>
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
                            <FormDescription>
                              The selling price.
                            </FormDescription>
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
                            <FormDescription>
                              Used for profit calculation.
                            </FormDescription>
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
                            <QuantityInput
                              value={field.value ?? 0}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormDescription>
                            This is the available stock for the product.
                          </FormDescription>
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
        </div>
      );
    },
  },
];

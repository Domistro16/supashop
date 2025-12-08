import ComponentCard from "@/components/common/ComponentCard2";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
import { addProduct } from "@/supabaseClient";
import { useState } from "react";
import { Supplier } from "@/lib/api";
import SupplierSearchSelect from "@/components/suppliers/SupplierSearchSelect";
import CategorySuggest from "@/components/products/CategorySuggest";
import toast from "react-hot-toast";
import { useDataRefresh } from "@/context/DataRefreshContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNIT_MULTIPLIERS = [
  { label: "Pieces", value: "pieces", multiplier: 1 },
  { label: "By 6s", value: "by6", multiplier: 6 },
  { label: "By 12s", value: "by12", multiplier: 12 },
  { label: "By 24s", value: "by24", multiplier: 24 },
  { label: "Crates (30)", value: "crates30", multiplier: 30 },
  { label: "Cartons (50)", value: "cartons50", multiplier: 50 },
  { label: "Dozens", value: "dozens", multiplier: 12 },
];

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function QuantityInput({ value, onChange }: QuantityInputProps) {
  const [inputValue, setInputValue] = useState<string>("0");
  const [selectedUnit, setSelectedUnit] = useState<string>("pieces");

  const currentMultiplier = UNIT_MULTIPLIERS.find(
    (u) => u.value === selectedUnit
  )?.multiplier || 1;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const num = parseInt(val) || 0;
    const totalStock = num * currentMultiplier;
    onChange(Math.max(0, totalStock));
  };

  const handleUnitChange = (unit: string) => {
    setSelectedUnit(unit);
    const newMultiplier = UNIT_MULTIPLIERS.find((u) => u.value === unit)?.multiplier || 1;
    const num = parseInt(inputValue) || 0;
    const totalStock = num * newMultiplier;
    onChange(Math.max(0, totalStock));
  };

  const displayQuantity = parseInt(inputValue) || 0;
  const totalStock = displayQuantity * currentMultiplier;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            type="number"
            min="0"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Enter quantity"
            className="w-full"
          />
        </div>
        <div className="w-[180px]">
          <Select value={selectedUnit} onValueChange={handleUnitChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {UNIT_MULTIPLIERS.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {selectedUnit !== "pieces" && totalStock > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {displayQuantity} × {currentMultiplier} = <span className="font-semibold text-blue-600 dark:text-blue-400">{totalStock} pieces</span>
        </div>
      )}
    </div>
  );
}

const formSchema = z.object({
  product_name: z.string().min(2, {
    error: "Product name must be at least 2 characters.",
  }),
  category: z.string().min(2, {
    error: "Category name must be at least 2 characters.",
  }),
  stock: z.int().min(0, {
    error: "Stock must be at least 0",
  }),
  price: z.string().min(2, {
    error: "Price must be at least 2 characters.",
  }),
});

export default function AddProducts() {
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const { refreshProducts } = useDataRefresh();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_name: "",
      category: "",
      stock: 0,
      price: "",
    },
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    setLoading(true);
    console.log(values);

    try {
      const response = await addProduct(
        values.product_name,
        values.category,
        values.stock,
        parseFloat(values.price),
        selectedSupplier?.id
      );

      if (response) {
        setLoading(false);
        form.reset();
        setSelectedSupplier(null);

        // Show success toast
        toast.success(`Product "${values.product_name}" added successfully!`, {
          duration: 3000,
        });

        // Refresh products list
        await refreshProducts();

        // Show low stock warning if stock is 10 or below
        if (values.stock <= 10) {
          toast.error(`Warning: "${values.product_name}" has low stock (${values.stock} units)`, {
            duration: 5000,
          });
        }
      }
      console.log("response from addProduct: ", response);
    } catch (error) {
      setLoading(false);
      console.error("Error adding product:", error);
      toast.error("Failed to add product. Please try again.", {
        duration: 4000,
      });
    }
  }
  return (
    <div className="container mx-auto py-3 sm:py-5">
      <PageMeta title="Add Product | Supashop" description="Add new products to your inventory" />
      <PageBreadcrumb pageTitle="Add Product" />
      <ComponentCard title={"Product Metadata"} className="text-[40px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row w-full gap-3 sm:gap-4">
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
                      <CategorySuggest
                        productName={form.watch("product_name")}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Enter Category"
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </FormControl>
                    <FormDescription>
                      Smart suggestions based on product name and existing categories.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-col sm:flex-row w-full gap-3 sm:gap-4">
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
                      This is the Price of the Product.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-col sm:flex-row w-full gap-3 sm:gap-4">
              <div className="flex-1">
                <FormLabel>Supplier (Optional)</FormLabel>
                <SupplierSearchSelect
                  selectedSupplier={selectedSupplier}
                  onSelectSupplier={setSelectedSupplier}
                />
                <FormDescription className="mt-2">
                  Search for an existing supplier or create a new one.
                </FormDescription>
              </div>
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
                    Enter quantity and select unit (e.g., "10 By 12s" = 120 pieces total stock).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="disabled:bg-white/75" type="submit" disabled={loading}>{loading ? '...' : 'Publish Product'}</Button>
          </form>
        </Form>
      </ComponentCard>
    </div>
  );
}

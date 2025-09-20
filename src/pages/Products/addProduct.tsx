import ComponentCard from "@/components/common/ComponentCard2";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
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

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function QuantityInput({ value, onChange }: QuantityInputProps) {
  const increase = () => onChange(value + 1);
  const decrease = () => onChange(Math.max(0, value - 1));

  return (
    <div className="flex items-center border rounded-lg overflow-hidden w-40 flex-1">
      <Button
        type="button"
        variant="ghost"
        className="rounded-none border-r h-10 w-10 p-0"
        onClick={decrease}
      >
        -
      </Button>
      <div className="text-center border-0 text-sm focus-visible:ring-0 bg-transparent focus-visible:ring-offset-0 flex-1 justify-center">
        {value}
      </div>
      <Button
        type="button"
        variant="ghost"
        className="rounded-none border-l h-10 w-10 p-0"
        onClick={increase}
      >
        +
      </Button>
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
  dealer: z.string().min(2, {
    error: "Dealer name must be at least 2 characters.",
  }),
  price: z.string().min(2, {
    error: "Price must be at least 2 characters.",
  }),
});

export default function AddProducts() {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_name: "",
      category: "",
      stock: 0,
      dealer: "",
      price: "",
    },
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    setLoading(true);
    console.log(values);
    const response = await addProduct(
      values.product_name,
      values.category,
      values.dealer,
      values.stock,
      parseFloat(values.price)
    );
    if (response) {
      setLoading(false);
      form.reset();
    }
    console.log("response from addProduct: ", response);
  }
  return (
    <div className="container mx-auto py-10">
      <PageBreadcrumb pageTitle="Add Product" />
      <ComponentCard title={"Product Metadata"} className="text-[40px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                      This is the Price of the Product.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dealer"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Dealer</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter Dealer"
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormDescription>
                      This is the dealer of the product.
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
            <Button className="disabled:bg-white/75" type="submit" disabled={loading}>{loading ? '...' : 'Publish Product'}</Button>
          </form>
        </Form>
      </ComponentCard>
    </div>
  );
}

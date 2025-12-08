import ComponentCard from "@/components/common/ComponentCard2";
import { columns, Product } from "./Columns";
import { DataTable } from "./DataTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { Button } from "@/components/ui/button";
import { DownloadIcon, RefreshCw, LayoutGrid, List, Search } from "lucide-react";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useMemo, useState, useEffect, useRef } from "react";
import { set } from "zod";
import { record_sale } from "@/supabaseClient";
import CustomerSearchSelect from "@/components/customers/CustomerSearchSelect";
import { Customer } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useDataRefresh } from "@/context/DataRefreshContext";
import toast from "react-hot-toast";
import ProductCard from "@/components/products/ProductCard";
function getData(): Product[] {
  // Fetch data from your API here.
  return [
    {
      id: "728ed52f",
      name: "Pants",
      price: "100",
      stock: 200,
      created_at: "2025-09-04T12:34:56.789Z",
      category: "Clothes",
      dealer: "McPherson clothes",
    },
    {
      id: "728ed42f",
      name: "Shoes",
      price: "300",
      stock: 600,
      created_at: "2023-09-04T12:34:56.789Z",
      category: "Clothes",
      dealer: "McPherson clothes",
    },
    {
      id: "728ed62f",
      name: "Panties",
      price: "100",
      stock: 400,
      created_at: "2024-09-04T12:34:56.789Z",
      category: "Clothes",
      dealer: "McPherson clothes",
    },
    // ...
  ];
}

type ViewMode = "table" | "grid";

export default function Products({ products }: { products: Product[] }) {
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [discounts, setDiscounts] = useState<Record<string, number>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { refreshProducts, refreshSales } = useDataRefresh();

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("productsViewMode");
      // Default to grid on mobile
      if (!saved) {
        return window.innerWidth < 768 ? "grid" : "table";
      }
      return (saved as ViewMode) || "table";
    }
    return "table";
  });

  // Grid view search
  const [gridSearch, setGridSearch] = useState("");

  // Save view preference
  useEffect(() => {
    localStorage.setItem("productsViewMode", viewMode);
  }, [viewMode]);

  // Filter products for grid view
  const filteredProducts = useMemo(() => {
    if (!gridSearch.trim()) return products;
    const search = gridSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search)
    );
  }, [products, gridSearch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProducts();
      toast.success("Products refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing products:", error);
      toast.error("Failed to refresh products");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleQuantityChange = (id: string, value: any) => {
    const num = Number(value);

    if (!isNaN(num) && num >= 0) {
      setQuantities((prev) => ({ ...prev, [id]: num }));
    }
  };

  const handleDiscountChange = (id: string, value: any) => {
    const num = Number(value);

    if (!isNaN(num) && num >= 0 && num <= 100) {
      setDiscounts((prev) => ({ ...prev, [id]: num }));
    }
  };

  const selectedProducts = useMemo(
    () =>
      selected.map((s) => ({
        product: s.id, // assuming your product has an `id` field
        quantity: quantities[s.id] ?? 1,
        unitCost: Number(s.price),
        discountPercent: discounts[s.id] ?? 0,
      })),
    [selected, quantities, discounts]
  );

  const total = selectedProducts.reduce(
    (sum, item) => {
      const itemTotal = item.unitCost * item.quantity;
      const discountAmount = (itemTotal * item.discountPercent) / 100;
      return sum + (itemTotal - discountAmount);
    },
    0
  );

  const onChange = (value: string) => {
    if (value.trim() === "") {
      setFiltered([]); // nothing when empty
    } else {
      setFiltered(
        products.filter((e) =>
          e.name.toLowerCase().includes(value.toLowerCase())
        )
      );
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text("Product List", 14, 22);

    // Add date
    doc.setFontSize(11);
    doc.setTextColor(100);
    const exportDate = new Date().toLocaleDateString("en-NG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.text(`Exported on: ${exportDate}`, 14, 30);

    // Prepare table data
    const tableData = products.map((product) => [
      product.name,
      product.category,
      new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
      }).format(Number(product.price)),
      product.stock.toString(),
      new Date(product.created_at).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    ]);

    // Generate table
    autoTable(doc, {
      head: [["Product Name", "Category", "Price", "Stock", "Created At"]],
      body: tableData,
      startY: 35,
      theme: "grid",
      headStyles: {
        fillColor: [37, 99, 235], // Blue color
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
    });

    // Save the PDF
    doc.save(`products-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const { openModal, isOpen, closeModal } = useModal();

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  return (
    <div className="container mx-auto py-3 sm:py-5">
      <PageMeta title="Products | Supashop" description="Manage and track your store's products inventory" />
      <PageBreadcrumb pageTitle="Products" />
      <ComponentCard
        title="Products List"
        className="text-[40px]"
        desc="Track your store's progress to boost your sales."
        buttons={
          <div className="flex flex-wrap items-center justify-between gap-1.5 md:gap-3 mb-2 md:mb-0 md:mr-3">
            {/* View Toggle */}
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className={`h-7 px-2 ${viewMode === "grid" ? "bg-blue-600 text-white" : "text-gray-500"}`}
                onClick={() => setViewMode("grid")}
                title="Grid view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className={`h-7 px-2 ${viewMode === "table" ? "bg-blue-600 text-white" : "text-gray-500"}`}
                onClick={() => setViewMode("table")}
                title="Table view"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Button
              variant="outline"
              className="text-gray-400 flex-end py-2 md:py-2.5 text-[11px] md:text-[13px] flex items-center h-8 md:h-9"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              className="text-gray-400 flex-end py-2 md:py-2.5 text-[11px] md:text-[13px] flex items-center h-8 md:h-9"
              onClick={exportToPDF}
            >
              <span className="hidden sm:inline">Export</span> <DownloadIcon className="sm:ml-1 h-3.5 w-3.5" />
            </Button>
            <Button
              variant="default"
              className="text-white bg-blue-700 hover:bg-blue-800 flex-end py-2 md:py-2.5 text-[11px] md:text-[13px] h-8 md:h-9"
              onClick={() => openModal()}
            >
              <span className="hidden sm:inline">Create</span> Sale
            </Button>
            <Button
              variant="default"
              className="text-white bg-blue-700 hover:bg-blue-800 flex-end py-2 md:py-2.5 text-[11px] md:text-[13px] h-8 md:h-9"
              onClick={() => (window.location.href = "/products/add")}
            >
              Add <span className="hidden sm:inline">Product</span> +
            </Button>
          </div>
        }
      >
        {viewMode === "table" ? (
          <DataTable columns={columns} data={products} />
        ) : (
          <div>
            {/* Grid View Search */}
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={gridSearch}
                  onChange={(e) => setGridSearch(e.target.value)}
                  className="pl-9 h-9 sm:h-10 dark:bg-gray-900"
                />
              </div>
            </div>

            {/* Product Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No products found{gridSearch && ` matching "${gridSearch}"`}</p>
              </div>
            )}

            {/* Product count */}
            <div className="mt-4 text-xs sm:text-sm text-gray-500">
              Showing {filteredProducts.length} of {products.length} product(s)
            </div>
          </div>
        )}
      </ComponentCard>
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[700px] p-4 sm:p-6 max-h-[85%] overflow-y-auto"
      >
        <div className="flex flex-col px-2 overflow-y-auto max-h-[80%] custom-scrollbar">
          <div>
            <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
              Record Sale
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create a Sale, by defining the quantity and submitting
            </p>
          </div>

          {/* Customer Selection */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer (Optional)
            </label>
            <CustomerSearchSelect
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
            />
          </div>

          <div>
            <div className="flex-col relative ">
              <Input
                ref={searchInputRef}
                placeholder="Search products..."
                className="max-w-sm dark:bg-gray-800 placeholder:text-gray-500 mt-10"
                onChange={(e) => onChange(e.target.value)}
              />
              <div hidden={filtered.length == 0} className="divide-y-1 mt-3 rounded-md dark:bg-gray-800 w-sm z-100 absolute border-1 border-gray-500">
                {filtered?.map((f, index) => (
                  <div
                    key={f.id || index}
                    onClick={() => {
                      const find = selected.find((e) => e.id == f.id);
                      if (find) {
                        console.log("Product already added");
                      } else {
                        setSelected((prev) => [...prev, f]);
                        // Set default quantity to 1 and discount to 0
                        setQuantities((prev) => ({ ...prev, [f.id]: 1 }));
                        setDiscounts((prev) => ({ ...prev, [f.id]: 0 }));
                      }
                      setFiltered([]);
                    }}
                    className="p-1 py-3 px-5 text-[14px] flex justify-between group font-medium text-gray-500 cursor-pointer"
                  >
                    <div className="text-white transition-all duration-200">
                      {f.name}
                    </div>

                    <div className="flex mr-5">
                      <div className="text-white mr-5">
                        {" "}
                        {new Intl.NumberFormat("en-NG", {
                          style: "currency",
                          currency: "NGN",
                        }).format(Number(f.price))}
                      </div>
                      <div className="text-white">QTY: {f.stock}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="p-1 px-5 text-[14px] w-full flex items-center  mt-10 group font-medium text-gray-500 cursor-pointer">
                  <div className="flex-1">Product</div>
                  <div className="mr-6">Unit Price</div>
                  <div className="mr-4">Qty</div>
                  <div className="mr-4">Disc%</div>
                  <div className="mr-6">Total</div>
                  <div className="w-10"></div>
                </div>
                {selected?.map((s, index) => {
                  const quantity = quantities[s.id] ?? 1;
                  const discount = discounts[s.id] ?? 0;
                  const subtotal = Number(s.price) * quantity;
                  const discountAmount = (subtotal * discount) / 100;
                  const total = subtotal - discountAmount;
                  return (
                    <div
                      key={index}
                      className="p-1 px-5 text-[14px] w-full flex items-center gap-2 group font-medium text-gray-500 cursor-pointer"
                    >
                      <div className="text-white flex-1">{s.name}</div>
                      <div className="text-white text-sm mr-2">
                        {new Intl.NumberFormat("en-NG", {
                          style: "currency",
                          currency: "NGN",
                        }).format(Number(s.price))}
                      </div>
                      <Input
                        className="max-w-[60px] text-white no-spinner"
                        type="number"
                        min={1}
                        max={s.stock}
                        value={quantity}
                        onChange={(e) => {
                          let val = e.target.value;

                          if (val === "") {
                            handleQuantityChange(s.id, "");
                            return;
                          }

                          let num = Number(val);
                          if (num < 1) num = 1;
                          if (num > s.stock) num = s.stock;

                          handleQuantityChange(s.id, num);
                        }}
                      />
                      <Input
                        className="max-w-[60px] text-white no-spinner"
                        type="number"
                        min={0}
                        max={100}
                        value={discount}
                        placeholder="0"
                        onChange={(e) => {
                          let val = e.target.value;

                          if (val === "") {
                            handleDiscountChange(s.id, 0);
                            return;
                          }

                          let num = Number(val);
                          if (num < 0) num = 0;
                          if (num > 100) num = 100;

                          handleDiscountChange(s.id, num);
                        }}
                      />
                      <div className="text-white text-sm mr-2 min-w-[80px]">
                        {new Intl.NumberFormat("en-NG", {
                          style: "currency",
                          currency: "NGN",
                        }).format(total)}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected((prev) => prev.filter((p) => p.id !== s.id));
                          setQuantities((prev) => {
                            const newQty = { ...prev };
                            delete newQty[s.id];
                            return newQty;
                          });
                          setDiscounts((prev) => {
                            const newDisc = { ...prev };
                            delete newDisc[s.id];
                            return newDisc;
                          });
                        }}
                        className="text-red-400 hover:text-red-600 ml-2"
                        title="Remove product"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                <div className="text-right text-white font-bold mt-4">
                  Total:{" "}
                  {new Intl.NumberFormat("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  }).format(total)}
                </div>
              </div>
            </div>
          </div>
          <div className="md:flex md:space-x-3 md:space-y-0 space-y-3 mt-5">
            <Button
              variant="outline"
              className="mt-10 text-white bg-blue-700 hover:bg-blue-800 flex-end md:py-6 text-[12px] md:text-[15px]"
              onClick={() => {
                // Handle form submission here
                setSelected([]);
                setQuantities({});
                setDiscounts({});
                setSelectedCustomer(null);
              }}
            >
              Reset
            </Button>
            <Button
              variant="default"
              className="mt-10 text-white bg-blue-700 hover:bg-blue-800 flex-end md:py-6 text-[12px] md:text-[15px]"
              onClick={async () => {
                // Handle form submission here
                console.log("Selected Products:", selectedProducts);
                console.log("Selected Customer:", selectedCustomer);

                try {
                  const success = await record_sale(selectedProducts, selectedCustomer?.id);

                  if (success) {
                    toast.success("Sale recorded successfully!");

                    // Refresh sales and products data
                    await Promise.all([refreshSales(), refreshProducts()]);

                    setSelected([]);
                    setQuantities({});
                    setDiscounts({});
                    setSelectedCustomer(null);
                    closeModal();
                  } else {
                    toast.error("Failed to record sale");
                  }
                } catch (error) {
                  console.error("Error recording sale:", error);
                  toast.error("Failed to record sale");
                }
              }}
            >
              Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

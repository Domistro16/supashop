import ComponentCard from "@/components/common/ComponentCard2";
import { columns, Product } from "./Columns";
import { DataTable } from "./DataTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { Button } from "@/components/ui/button";
import { DownloadIcon, RefreshCw, LayoutGrid, List, Search, ScanLine } from "lucide-react";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import Spinner from "@/components/ui/Spinner";
import { useMemo, useState, useEffect, useRef } from "react";
import { set } from "zod";
import { record_sale } from "@/supabaseClient";
import CustomerSearchSelect from "@/components/customers/CustomerSearchSelect";
import { Customer, InstallmentInput } from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useDataRefresh } from "@/context/DataRefreshContext";
import { useAuth } from "@/auth";
import toast from "react-hot-toast";
import ProductCard from "@/components/products/ProductCard";
import BarcodeScanner from "@/components/common/BarcodeScanner";
import QuickSell from "@/components/sales/QuickSell";
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
  const [unitModes, setUnitModes] = useState<Record<string, 'piece' | 'pack'>>({});
  const [discounts, setDiscounts] = useState<Record<string, number>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { refreshProducts, refreshSales } = useDataRefresh();
  const { currentShop } = useAuth();

  const canGiveDiscount = useMemo(() => {
    if (!currentShop) return false;
    return currentShop.role === 'owner' || currentShop.permissions?.includes('sales:discount');
  }, [currentShop]);

  // Payment tracking state
  const [paymentType, setPaymentType] = useState<'full' | 'installment'>('full');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card'>('cash');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferProofFile, setTransferProofFile] = useState<File | null>(null);

  // Multi-installment state
  const [installments, setInstallments] = useState<InstallmentInput[]>([]);
  const [installmentProofFiles, setInstallmentProofFiles] = useState<(File | null)[]>([]);
  const [newInstAmount, setNewInstAmount] = useState<number | ''>('');
  const [newInstMethod, setNewInstMethod] = useState<'cash' | 'bank_transfer' | 'card'>('cash');
  const [newInstNotes, setNewInstNotes] = useState('');
  const [newInstProofFile, setNewInstProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Barcode scan-to-sell state
  const [scanToSellOpen, setScanToSellOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);

  // Auto-open scanner when launched from PWA shortcut (?scan=1)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("scan") === "1") {
      setScanToSellOpen(true);
    }
  }, []);

  const handleBarcodeScan = (code: string) => {
    const match = products.find((p) => p.barcode === code);
    if (match) {
      if (match.stock <= 0) {
        toast.error(`${match.name} is out of stock`);
        return;
      }
      setScannedProduct(match);
      setScanToSellOpen(false);
      toast.success(`Found: ${match.name}`);
    } else {
      toast.error(`No product found for barcode ${code}`);
    }
  };

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

  // Calculate total paid from installments
  const installmentTotal = useMemo(() => {
    return installments.reduce((sum, inst) => sum + Number(inst.amount), 0);
  }, [installments]);

  // Calculate outstanding balance
  const outstandingBalance = useMemo(() => {
    if (paymentType === 'full') return 0;
    return Math.max(0, total - installmentTotal);
  }, [paymentType, installmentTotal, total]);

  // Add installment helper
  const addInstallment = () => {
    if (!newInstAmount || newInstAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (newInstAmount > outstandingBalance) {
      toast.error(`Amount exceeds remaining balance`);
      return;
    }
    const trimmedNotes = newInstMethod === 'bank_transfer' && newInstNotes.trim().length > 0
      ? newInstNotes.trim().slice(0, 500)
      : undefined;
    const newInst: InstallmentInput = {
      amount: newInstAmount,
      paymentMethod: newInstMethod,
      notes: trimmedNotes,
    };
    const newProof = newInstMethod === 'bank_transfer' ? newInstProofFile : null;
    setInstallments([...installments, newInst]);
    setInstallmentProofFiles([...installmentProofFiles, newProof]);
    setNewInstAmount('');
    setNewInstMethod('cash');
    setNewInstNotes('');
    setNewInstProofFile(null);
  };

  const removeInstallment = (index: number) => {
    setInstallments(installments.filter((_, i) => i !== index));
    setInstallmentProofFiles(installmentProofFiles.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);
  };

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

    // Get shop details
    const savedShop = typeof window !== 'undefined' && localStorage.getItem('current_shop')
      ? JSON.parse(localStorage.getItem('current_shop') || '{}')
      : { name: "Supashop" };

    // Shop Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(savedShop.name || "Supashop", 14, 20);

    if (savedShop.address) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(savedShop.address, 14, 26);
    }

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Product Inventory List", 14, 35);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const exportDate = new Date().toLocaleDateString("en-NG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    doc.text(`Generated on: ${exportDate}`, 14, 41);

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
      startY: 45,
      theme: "grid",
      headStyles: {
        fillColor: [66, 66, 66], // Darker professional gray/black
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "left"
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak'
      },
      columnStyles: {
        2: { halign: 'right' }, // Price
        3: { halign: 'center' }, // Stock
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      foot: [["", "", "Total Items:", products.length.toString(), ""]],
      footStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold"
      }
    });

    // Save the PDF
    doc.save(`products-inventory-${new Date().toISOString().split("T")[0]}.pdf`);
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
              className="text-white bg-emerald-600 hover:bg-emerald-700 flex-end py-2 md:py-2.5 text-[11px] md:text-[13px] h-8 md:h-9"
              onClick={() => setScanToSellOpen(true)}
              title="Scan a barcode to sell"
            >
              <ScanLine className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Scan Sell</span>
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

              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="p-1 px-5 text-[14px] w-full flex items-center mt-6 mb-2 group font-medium text-gray-400 border-b border-gray-700 pb-2">
                    <div className="flex-1">Product</div>
                    <div className="w-28 text-right">Unit Price</div>
                    <div className="w-32 text-center">Qty</div>
                    <div className="w-20 text-center">Disc%</div>
                    <div className="w-28 text-right">Total</div>
                    <div className="w-8"></div>
                  </div>
                  {selected?.map((s, index) => {
                    const quantity = quantities[s.id] ?? 1;
                    const discount = discounts[s.id] ?? 0;
                    const subtotal = Number(s.price) * quantity;
                    const discountAmount = (subtotal * discount) / 100;
                    const total = subtotal - discountAmount;
                    const rowPackSize = Math.max(1, Number((s as any).packSize) || 1);
                    const rowPackName = (s as any).packName as string | null | undefined;
                    const rowMode = unitModes[s.id] ?? 'piece';
                    const rowHasPack = rowPackSize > 1;
                    const packCount = rowMode === 'pack' ? Math.floor(quantity / rowPackSize) : 0;
                    const extrasCount = rowMode === 'pack' ? quantity % rowPackSize : 0;
                    const maxPackCount = Math.floor(s.stock / rowPackSize);
                    return (
                      <div
                        key={index}
                        className="p-1 px-5 text-[14px] w-full flex items-start py-2 hover:bg-white/5 transition-colors border-b border-gray-800/50"
                      >
                        <div className="flex-1 text-white font-medium truncate pr-2" title={s.name}>
                          {s.name}
                          {rowHasPack && rowMode === 'pack' && (
                            <span className="ml-2 text-[10px] text-gray-400">
                              = {quantity} pcs
                            </span>
                          )}
                        </div>
                        <div className="w-28 text-right text-white text-sm">
                          {new Intl.NumberFormat("en-NG", {
                            style: "currency",
                            currency: "NGN",
                          }).format(Number(s.price))}
                        </div>
                        <div className="w-32 flex flex-col justify-center px-1 gap-1">
                          <div className="flex gap-1 items-center">
                            <Input
                              className="w-full text-center h-8 text-white no-spinner bg-gray-900/50 border-gray-600 focus:border-blue-500"
                              type="number"
                              min={rowMode === 'pack' ? 0 : 1}
                              max={rowMode === 'pack' ? maxPackCount : s.stock}
                              value={rowMode === 'pack' ? packCount : quantity}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") {
                                  handleQuantityChange(s.id, "");
                                  return;
                                }
                                const raw = Number(val);
                                if (rowMode === 'pack') {
                                  const packs = Math.max(0, Math.min(maxPackCount, raw));
                                  const pieces = packs * rowPackSize + extrasCount;
                                  handleQuantityChange(s.id, Math.max(1, pieces));
                                } else {
                                  const pieces = Math.max(1, Math.min(s.stock, raw));
                                  handleQuantityChange(s.id, pieces);
                                }
                              }}
                            />
                            {rowHasPack && (
                              <select
                                value={rowMode}
                                onChange={(e) => {
                                  const next = e.target.value as 'piece' | 'pack';
                                  setUnitModes((prev) => ({ ...prev, [s.id]: next }));
                                  if (next === 'pack') {
                                    const curPieces = quantities[s.id] ?? 1;
                                    if (curPieces < rowPackSize) {
                                      const bumped = Math.min(s.stock, rowPackSize);
                                      handleQuantityChange(s.id, bumped);
                                    }
                                  }
                                }}
                                className="h-8 text-[10px] bg-gray-900/50 border border-gray-600 text-white rounded px-1"
                                title={rowPackName ? `Pack = ${rowPackSize} pcs per ${rowPackName}` : `Pack = ${rowPackSize} pcs`}
                              >
                                <option value="piece">pcs</option>
                                <option value="pack">{rowPackName || 'pack'}</option>
                              </select>
                            )}
                          </div>
                          {rowHasPack && rowMode === 'pack' && (
                            <Input
                              className="w-full text-center h-7 text-white no-spinner bg-gray-900/50 border-gray-600 focus:border-blue-500 text-[11px]"
                              type="number"
                              min={0}
                              max={rowPackSize - 1}
                              value={extrasCount}
                              placeholder="+ loose"
                              onChange={(e) => {
                                const raw = Number(e.target.value) || 0;
                                const extras = Math.max(0, Math.min(rowPackSize - 1, raw));
                                const pieces = Math.max(1, packCount * rowPackSize + extras);
                                if (pieces <= s.stock) {
                                  handleQuantityChange(s.id, pieces);
                                }
                              }}
                              title="Loose pieces on top of the packs"
                            />
                          )}
                        </div>
                        <div className="w-20 flex justify-center px-1">
                          <Input
                            className={`w-full text-center h-8 text-white no-spinner bg-gray-900/50 border-gray-600 focus:border-blue-500 ${!canGiveDiscount ? 'opacity-50 cursor-not-allowed' : ''}`}
                            type="number"
                            min={0}
                            max={100}
                            value={discount}
                            placeholder="0"
                            disabled={!canGiveDiscount}
                            title={!canGiveDiscount ? "Only owners can give discounts" : "Discount percentage"}
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
                        </div>
                        <div className="w-28 text-right text-white text-sm font-medium">
                          {new Intl.NumberFormat("en-NG", {
                            style: "currency",
                            currency: "NGN",
                          }).format(total)}
                        </div>
                        <div className="w-8 flex justify-end">
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
                              setUnitModes((prev) => {
                                const next = { ...prev };
                                delete next[s.id];
                                return next;
                              });
                            }}
                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                            title="Remove product"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex flex-col items-end mt-4">
                    <div className="text-white font-bold">
                      Total:{" "}
                      {new Intl.NumberFormat("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      }).format(total)}
                    </div>
                    <div className="text-xs text-gray-300 mt-1 space-y-1 text-right">
                      <div>
                        Expected Profit: <span className="text-purple-400 font-medium">
                          {(() => {
                            const totalCost = selected.reduce((sum, p) => sum + ((quantities[p.id] || 0) * Number(p.costPrice || 0)), 0);
                            const profit = Math.max(0, total - totalCost);
                            const margin = total > 0 ? (profit / total) * 100 : 0;

                            return (
                              <>
                                {new Intl.NumberFormat("en-NG", {
                                  style: "currency",
                                  currency: "NGN",
                                }).format(profit)}
                                <span className="ml-2 text-xs bg-purple-500/20 px-2 py-0.5 rounded-full">
                                  {margin.toFixed(0)}%
                                </span>
                              </>
                            );
                          })()}
                        </span>
                      </div>
                      <div>
                        Realized Profit: <span className="text-green-400 font-medium">
                          {(() => {
                            const totalCost = selected.reduce((sum, p) => sum + ((quantities[p.id] || 0) * Number(p.costPrice || 0)), 0);
                            const expectedProfit = Math.max(0, total - totalCost);
                            const paid = paymentType === 'full' ? total : installmentTotal;
                            const realized = total > 0 ? (paid / total) * expectedProfit : 0;

                            return new Intl.NumberFormat("en-NG", {
                              style: "currency",
                              currency: "NGN",
                            }).format(realized);
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="mt-6 space-y-4">
            {/* Payment Type Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType('full')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${paymentType === 'full'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  Full Payment
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('installment')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${paymentType === 'installment'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  Installment
                </button>
              </div>
            </div>

            {/* Full Payment Method */}
            {paymentType === 'full' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank_transfer' | 'card')}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                {paymentMethod === 'bank_transfer' && (
                  <div className="space-y-3 p-3 bg-gray-100 dark:bg-gray-800/50 rounded-md">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Notes <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={transferNotes}
                        onChange={(e) => setTransferNotes(e.target.value.slice(0, 500))}
                        rows={2}
                        placeholder="e.g. Sent from GTBank — John A."
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Proof of Payment <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md p-3 text-center relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setTransferProofFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={isSubmitting}
                        />
                        {transferProofFile ? (
                          <div className="text-blue-600 dark:text-blue-400 font-medium text-xs break-all">
                            {transferProofFile.name}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Attach receipt image (JPG/PNG, up to 5MB)
                          </div>
                        )}
                      </div>
                      {transferProofFile && (
                        <button
                          type="button"
                          onClick={() => setTransferProofFile(null)}
                          className="mt-1 text-xs text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Installment Payments */}
            {paymentType === 'installment' && (
              <div className="space-y-3">
                {/* Installment List */}
                {installments.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 space-y-2">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Installments Added</div>
                    {installments.map((inst, idx) => (
                      <div key={idx} className="flex justify-between items-start gap-2 text-sm bg-white dark:bg-gray-800 p-2 rounded">
                        <div className="min-w-0 flex-1">
                          <div>
                            <span className="font-medium">{formatCurrency(Number(inst.amount))}</span>
                            <span className="text-gray-500 dark:text-gray-400 ml-2">({inst.paymentMethod.replace('_', ' ')})</span>
                            {installmentProofFiles[idx] && (
                              <span className="text-[10px] ml-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                                proof
                              </span>
                            )}
                          </div>
                          {inst.notes && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={inst.notes}>
                              {inst.notes}
                            </div>
                          )}
                        </div>
                        <button type="button" onClick={() => removeInstallment(idx)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Installment */}
                {outstandingBalance > 0 && (
                  <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-md p-3 space-y-3">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Installment</div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" value={newInstAmount} onChange={(e) => setNewInstAmount(e.target.value ? Number(e.target.value) : '')} placeholder="Amount" className="dark:bg-gray-800" />
                      <select value={newInstMethod} onChange={(e) => setNewInstMethod(e.target.value as 'cash' | 'bank_transfer' | 'card')}
                        className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90">
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="card">Card</option>
                      </select>
                    </div>
                    {newInstMethod === 'bank_transfer' && (
                      <div className="space-y-2 bg-white dark:bg-gray-800/50 p-2 rounded border border-gray-200 dark:border-gray-700">
                        <textarea
                          value={newInstNotes}
                          onChange={(e) => setNewInstNotes(e.target.value.slice(0, 500))}
                          rows={2}
                          placeholder="Notes (optional) — e.g. GTBank transfer"
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90"
                        />
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md p-2 text-center relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setNewInstProofFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          {newInstProofFile ? (
                            <div className="text-blue-600 dark:text-blue-400 font-medium text-xs break-all">
                              {newInstProofFile.name}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 dark:text-gray-400">Attach proof (optional)</div>
                          )}
                        </div>
                      </div>
                    )}
                    <button type="button" onClick={addInstallment}
                      className="w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      + Add Installment
                    </button>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Paid ({installments.length} installment{installments.length !== 1 ? 's' : ''})</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(installmentTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
                    <span className="text-gray-600 dark:text-gray-400">Remaining</span>
                    <span className={`font-medium ${outstandingBalance > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                      {formatCurrency(outstandingBalance)}
                    </span>
                  </div>
                </div>

                {/* Warning */}
                {outstandingBalance > 0 && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-3">
                    <p className="text-sm text-orange-700 dark:text-orange-300">⚠️ This sale will be marked as <strong>"Pending"</strong></p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="md:flex md:space-x-3 md:space-y-0 space-y-3 mt-5">
            <Button
              variant="outline"
              className="mt-10 text-white bg-blue-700 hover:bg-blue-800 flex-end md:py-6 text-[12px] md:text-[15px]"
              onClick={() => {
                // Reset form
                setSelected([]);
                setQuantities({});
                setUnitModes({});
                setDiscounts({});
                setSelectedCustomer(null);
                setPaymentType('full');
                setPaymentMethod('cash');
                setTransferNotes('');
                setTransferProofFile(null);
                setInstallments([]);
                setInstallmentProofFiles([]);
              }}
            >
              Reset
            </Button>
            <Button
              variant="default"
              className="mt-10 text-white bg-blue-700 hover:bg-blue-800 flex-end md:py-6 text-[12px] md:text-[15px]"
              disabled={isSubmitting}
              onClick={async () => {
                // Validate payment for installments
                if (paymentType === 'installment' && installments.length === 0) {
                  toast.error('Please add at least one installment payment');
                  return;
                }

                setIsSubmitting(true);
                console.log("Selected Products:", selectedProducts);
                console.log("Selected Customer:", selectedCustomer);

                try {
                  const trimmedTransferNotes = paymentMethod === 'bank_transfer' && transferNotes.trim().length > 0
                    ? transferNotes.trim().slice(0, 500)
                    : undefined;
                  const sale = await record_sale(
                    selectedProducts,
                    selectedCustomer?.id,
                    paymentType === 'full'
                      ? {
                        paymentType: 'full',
                        paymentMethod,
                        amountPaid: total,
                        notes: trimmedTransferNotes,
                      }
                      : {
                        paymentType: 'installment',
                        installments,
                      }
                  );

                  if (sale) {
                    try {
                      const createdInstallments: Array<{ id: string }> = Array.isArray(sale?.installments) ? sale.installments : [];
                      const uploads: Array<Promise<any>> = [];

                      if (paymentType === 'full' && paymentMethod === 'bank_transfer' && transferProofFile && createdInstallments[0]?.id) {
                        const fd = new FormData();
                        fd.append('file', transferProofFile);
                        fd.append('orderId', sale.id);
                        fd.append('installmentId', createdInstallments[0].id);
                        uploads.push(fetch('/api/upload', { method: 'POST', body: fd }));
                      }

                      if (paymentType === 'installment') {
                        installmentProofFiles.forEach((file, idx) => {
                          const target = createdInstallments[idx];
                          if (file && target?.id) {
                            const fd = new FormData();
                            fd.append('file', file);
                            fd.append('orderId', sale.id);
                            fd.append('installmentId', target.id);
                            uploads.push(fetch('/api/upload', { method: 'POST', body: fd }));
                          }
                        });
                      }

                      if (uploads.length > 0) {
                        const results = await Promise.allSettled(uploads);
                        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !(r.value as Response).ok));
                        if (failed.length > 0) {
                          toast.error(`Sale saved, but ${failed.length} proof upload${failed.length > 1 ? 's' : ''} failed`);
                        }
                      }
                    } catch (uploadErr: any) {
                      console.error('Proof upload error:', uploadErr);
                      toast.error(`Sale saved, but proof upload failed: ${uploadErr.message || 'unknown error'}`);
                    }

                    const statusMsg = outstandingBalance > 0 ? ' (Pending payment)' : '';
                    toast.success(`Sale recorded successfully!${statusMsg}`);

                    // Refresh sales and products data
                    await Promise.all([refreshSales(), refreshProducts()]);

                    setSelected([]);
                    setQuantities({});
                    setDiscounts({});
                    setSelectedCustomer(null);
                    setPaymentType('full');
                    setPaymentMethod('cash');
                    setTransferNotes('');
                    setTransferProofFile(null);
                    setInstallments([]);
                    setInstallmentProofFiles([]);
                    closeModal();
                  } else {
                    toast.error("Failed to record sale");
                  }
                } catch (error) {
                  console.error("Error recording sale:", error);
                  toast.error("Failed to record sale");
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" className="text-white" />
                  Submitting...
                </span>
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      <BarcodeScanner
        open={scanToSellOpen}
        onClose={() => setScanToSellOpen(false)}
        onScan={handleBarcodeScan}
        title="Scan to sell"
      />

      {scannedProduct && (
        <QuickSell
          product={scannedProduct}
          onClose={() => setScannedProduct(null)}
          onSuccess={() => setScannedProduct(null)}
        />
      )}
    </div>
  );
}

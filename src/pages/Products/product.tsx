import ComponentCard from "@/components/common/ComponentCard2";
import { columns, Product } from "./Columns";
import { DataTable } from "./DataTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Button } from "@/components/ui/button";
import { DownloadIcon } from "lucide-react";
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

export default function Products({ products }: { products: Product[] }) {
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleQuantityChange = (id: string, value: any) => {
    const num = Number(value);

    if (!isNaN(num) && num >= 0) {
      setQuantities((prev) => ({ ...prev, [id]: num }));
    }
  };

  const selectedProducts = useMemo(
    () =>
      selected.map((s) => ({
        product: s.id, // assuming your product has an `id` field
        quantity: quantities[s.id] ?? 1,
        unitCost: Number(s.price),
      })),
    [selected, quantities]
  );

  const total = selectedProducts.reduce(
    (sum, item) => sum + item.unitCost * item.quantity,
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
    <div className="container mx-auto py-10">
      <PageBreadcrumb pageTitle="Products" />
      <ComponentCard
        title="Products List"
        className="text-[40px]"
        desc="Track your store's progress to boost your sales."
        buttons={
          <div className="flex items-center justify-between gap-1 md:gap-5 mb-2 md:mb-0 md:mr-5">
            <Button
              variant="outline"
              className="text-gray-400 flex-end md:py-6 text-[12px] md:text-[15px] flex items-center"
              onClick={exportToPDF}
            >
              Export <DownloadIcon className="ml-1 h-4 w-4" />
            </Button>
            <Button
              variant="default"
              className="text-white bg-blue-700 hover:bg-blue-800 flex-end md:py-6 text-[12px] md:text-[15px]"
              onClick={() => openModal()}
            >
              Create Sale
            </Button>
            <Button
              variant="default"
              className="text-white bg-blue-700 hover:bg-blue-800 flex-end md:py-6 text-[12px] md:text-[15px]"
              onClick={() => (window.location.href = "/products/add")}
            >
              Add Product +
            </Button>
          </div>
        }
      >
        <DataTable columns={columns} data={products} />
      </ComponentCard>
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[700px] p-6 lg:p-10 max-h-[80%] overflow-y-auto"
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
                        // Set default quantity to 1
                        setQuantities((prev) => ({ ...prev, [f.id]: 1 }));
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
                  <div className="mr-8">Cost</div>
                  <div className="mr-4">Quantity</div>
                  <div className="w-10"></div>
                </div>
                {selected?.map((s, index) => {
                  const quantity = quantities[s.id] ?? 1;
                  const cost = Number(s.price) * quantity;
                  return (
                    <div
                      key={index}
                      className="p-1 px-5 text-[14px] w-full flex items-center  group font-medium text-gray-500 cursor-pointer"
                    >
                      <div className="text-white flex-1">{s.name}</div>
                      <div className="text-white mr-5">
                        {" "}
                        {new Intl.NumberFormat("en-NG", {
                          style: "currency",
                          currency: "NGN",
                        }).format(cost)}
                      </div>
                      <Input
                        className="max-w-[70px] text-white no-spinner"
                        type="number"
                        min={1}
                        max={s.stock}
                        value={quantity}
                        onChange={(e) => {
                          let val = e.target.value;

                          // Allow clearing the field without forcing a number immediately
                          if (val === "") {
                            handleQuantityChange(s.id, "");
                            return;
                          }

                          let num = Number(val);

                          // Clamp between 1 and s.stock
                          if (num < 1) num = 1;
                          if (num > s.stock) num = s.stock;

                          handleQuantityChange(s.id, num);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelected((prev) => prev.filter((p) => p.id !== s.id));
                          setQuantities((prev) => {
                            const newQty = { ...prev };
                            delete newQty[s.id];
                            return newQty;
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
                setSelectedCustomer(null);
              }}
            >
              Reset
            </Button>
            <Button
              variant="default"
              className="mt-10 text-white bg-blue-700 hover:bg-blue-800 flex-end md:py-6 text-[12px] md:text-[15px]"
              onClick={() => {
                // Handle form submission here
                console.log("Selected Products:", selectedProducts);
                console.log("Selected Customer:", selectedCustomer);
                record_sale(selectedProducts, selectedCustomer?.id);
                setSelected([]);
                setQuantities({});
                setSelectedCustomer(null);
                closeModal();
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

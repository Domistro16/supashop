import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { Button } from "@/components/ui/button";
import { useParams } from "@/lib/react-router-compat";
import { DataTable } from "./DataTable2";
import { columns, Item } from "./Columns2";
import Badge from "@/components/ui/badge/Badge";
import { Transaction } from "./Columns";
import { getSaleItems, getSale, getShop } from "@/supabaseClient";
import { useEffect, useState, useRef, useMemo } from "react";
import Spinner from "@/components/ui/Spinner";

// ... (existing code)

export default function Single({
  transactions,
  orderId: propOrderId,
}: {
  transactions: Transaction[];
  orderId?: string;
}) {
  const params = useParams();
  const orderId = propOrderId || params?.orderId;

  // Try to find in props (support both order_id and UUID)
  const safeTransactions = transactions || [];
  const saleFromProps = safeTransactions.find((t) =>
    String(t.order_id) === String(orderId) || String(t.id) === String(orderId)
  );

  const [fetchedSale, setFetchedSale] = useState<Transaction | null>(null);
  const [loadingSale, setLoadingSale] = useState(false);
  const hasAttemptedFetch = useRef(false);

  useEffect(() => {
    if (!saleFromProps && orderId && !fetchedSale && !loadingSale && !hasAttemptedFetch.current) {
      hasAttemptedFetch.current = true;
      setLoadingSale(true);
      getSale(orderId).then(data => {
        if (data) setFetchedSale(data);
        setLoadingSale(false);
      });
    }
  }, [saleFromProps, orderId, fetchedSale, loadingSale]);

  const activeSale = saleFromProps || fetchedSale;
  const sale = useMemo(() => activeSale ? [activeSale] : [], [activeSale]);

  const [items, setItems] = useState<Item[]>();
  const [total, setTotal] = useState(0);
  const [formatted, setFormatted] = useState("");
  const [staff, setStaff] = useState("");
  const [shopInfo, setShopInfo] = useState<{ name: string, address: string, phone: string } | null>(null);

  useEffect(() => {
    const fetchShopInfo = async () => {
      // Try local storage first for immediate render
      const savedShop = localStorage.getItem('current_shop')
        ? JSON.parse(localStorage.getItem('current_shop') || '{}')
        : null;

      if (savedShop) {
        setShopInfo(savedShop);
      }

      // Then fetch fresh data
      try {
        const shop = await getShop();
        if (shop) {
          const info = {
            name: shop.name,
            address: shop.address || '',
            phone: (shop as any).phone || ''
          };
          setShopInfo(info);
          // Update local storage
          localStorage.setItem('current_shop', JSON.stringify({ ...savedShop, ...info }));
        } else if (!savedShop) {
          setShopInfo({ name: 'SUPASHOP', address: 'Store Address', phone: '' });
        }
      } catch (e) {
        console.error("Failed to fetch shop info:", e);
      }
    };

    fetchShopInfo();
  }, []);

  useEffect(() => {
    if (sale.length == 0) return;
    function getStaffName() {
      setStaff(sale[0].staff_id);
    }
    getStaffName();
  }, [sale]);

  useEffect(() => {
    if (sale.length == 0) return;

    const date = new Intl.DateTimeFormat("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(new Date(sale[0].created_at));

    setFormatted(date);
  }, [sale]);

  useEffect(() => {
    async function callItems() {
      if (sale.length == 0 || items) return;
      const data = await getSaleItems(sale[0].id);

      setItems(data);

      if (data.length > 0) {
        let totalAmount = 0;
        for (const item of data) {
          const subtotal = item.unitCost * item.quantity;
          const discount = item.discountPercent ?? 0;
          const discountAmount = (subtotal * discount) / 100;
          totalAmount += (subtotal - discountAmount);
        }
        setTotal(totalAmount);
      }
    }
    callItems();
  }, [sale, items]); // Added items dependency to satisfy hook rules or remove it if intended to run once per sale

  const handlePrint = () => {
    window.print();
  };

  if (!activeSale && loadingSale) {
    return <div className="flex justify-center items-center py-20"><Spinner size="lg" /></div>;
  }

  if (!activeSale && !loadingSale) {
    return <div className="p-10 text-center text-gray-500">Transaction not found.</div>;
  }

  const currentCustomer = sale.length > 0 ? sale[0].customer : null;

  return (
    <div>
      <PageMeta
        title="Transaction Detail | Supashop"
        description="View detailed information about a transaction"
      />
      <PageBreadcrumb pageTitle="Single Transaction" />

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            height: 0; 
            overflow: hidden;
          }
          .print-content {
            visibility: visible !important;
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            color: black !important;
          }
          .print-content * {
            visibility: visible !important;
            height: auto !important;
            overflow: visible !important;
            color: black !important; 
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%; /* Or fixed 80mm width if enforcing thermal paper size strictly */
            max-width: 300px; /* Standard thermal receipt width */
            margin: 0 auto;
            right: 0;
            font-family: 'Courier New', Courier, monospace;
            padding: 10px;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 0;
            size: auto;
          }
        }
      `}</style>

      {/* Screen view */}
      <div
        className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]
                py-3 px-4 sm:px-6 md:px-8 lg:px-10
                flex flex-col md:flex-row md:items-center md:justify-between gap-3 no-print"
      >
        {/* Left section */}
        <div className="w-full text-gray-400 dark:text-gray-400 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <h5 className="flex items-center gap-2 px-0 sm:px-3 sm:border-r sm:border-gray-500 dark:border-gray-600 text-base font-medium">
              Order ID: #{orderId}{" "}
              <Badge variant="light" color="success">
                Completed
              </Badge>
            </h5>
            <h5 className="text-sm sm:text-[15px]">
              Sold On: {formatted} By {staff}
            </h5>
          </div>
          {currentCustomer && (
            <div className="px-0 sm:px-3">
              <h5 className="text-sm sm:text-[15px] text-gray-600 dark:text-gray-300">
                Sold To: <span className="font-semibold text-gray-800 dark:text-white">{currentCustomer.name}</span>
                {currentCustomer.phone && (
                  <span className="ml-2 text-gray-500 dark:text-gray-400">• {currentCustomer.phone}</span>
                )}
              </h5>
            </div>
          )}
        </div>

        {/* Right section (buttons) */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
            onClick={handlePrint}
          >
            Download Receipt
          </Button>
          <Button
            variant="outline"
            className="px-4 py-2"
            onClick={handlePrint}
          >
            Print Receipt
          </Button>
        </div>
      </div>

      {/* Screen Table (Hidden on Print) */}
      <div className="mt-5 no-print">
        <div className="rounded-2xl border border-gray-200 bg-white py-4 px-5 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-6 items-center">
          <div className="w-full mb-5">
            <h5 className="px-3 text-[20px] font-medium text-gray-800 dark:text-white/90">Order Details</h5>
          </div>
          <DataTable columns={columns} data={items ? items : []} />
          <div className="flex justify-end mt-5">
            <div className="flex gap-10">
              <h5 className="text-gray-400 dark:text-gray-400 font-medium text-lg">Total</h5>
              <h5 className="text-gray-900 dark:text-white text-xl font-bold">
                {new Intl.NumberFormat("en-NG", {
                  style: "currency",
                  currency: "NGN",
                }).format(total)}
              </h5>
            </div>
          </div>
        </div>
      </div>

      {/* Thermal Receipt Print Content */}
      <div className="print-content hidden">
        <div className="text-center mb-4">
          <h2 className="font-bold text-xl uppercase mb-1">{shopInfo?.name || 'Supashop'}</h2>
          <p className="text-xs">{shopInfo?.address}</p>
          {shopInfo?.phone && <p className="text-xs">Tel: {shopInfo?.phone}</p>}
        </div>

        <div className="border-b border-dashed border-black my-2"></div>

        <div className="text-xs space-y-1 mb-2">
          <div className="flex justify-between">
            <span>Ord #: {orderId}</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
          <div>Cashier: {staff}</div>
          {currentCustomer && (
            <div>Cust: {currentCustomer.name}</div>
          )}
        </div>

        <div className="border-b border-dashed border-black my-2"></div>

        <table className="w-full text-xs text-left mb-2">
          <thead>
            <tr className="border-b border-dashed border-black">
              <th className="py-1 w-[45%]">Item</th>
              <th className="py-1 w-[15%] text-center">Qty</th>
              <th className="py-1 w-[20%] text-right">Price</th>
              <th className="py-1 w-[20%] text-right">Amt</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((item, index) => {
              const discount = item.discountPercent ?? 0;
              const subtotal = item.unitCost * item.quantity;
              const discountAmount = (subtotal * discount) / 100;
              const totalLine = subtotal - discountAmount;

              return (
                <tr key={index} className="">
                  <td className="py-1">
                    <div className="font-bold">{item.product}</div>
                    {discount > 0 && <div className="text-[10px] italic">Disc: {discount}%</div>}
                  </td>
                  <td className="py-1 text-center align-top">{item.quantity}</td>
                  <td className="py-1 text-right align-top">{item.unitCost.toLocaleString()}</td>
                  <td className="py-1 text-right align-top font-bold">{totalLine.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="border-b border-dashed border-black my-2"></div>

        <div className="space-y-1 text-sm font-bold">
          <div className="flex justify-between">
            <span>TOTAL</span>
            <span className="text-lg">
              {new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
              }).format(total)}
            </span>
          </div>
        </div>

        <div className="border-b border-dashed border-black my-4"></div>

        <div className="text-center text-xs">
          <p>Thank you for shopping!</p>
          <p className="mt-1">Powered by Supashop</p>
        </div>
      </div>
    </div>
  );
}

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
import api, { Installment } from "@/lib/api";
import { toast } from "react-hot-toast";
import { Share2 } from "lucide-react";

// ... (existing code)

export default function Single({
  transactions,
  orderId: propOrderId,
}: {
  transactions: Transaction[];
  orderId?: string;
}) {
  const params = useParams() as any;
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

  // Record Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card'>('cash');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Installments history
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);

  // Function to refetch sale data after payment update
  const refetchSale = async () => {
    if (!orderId) return;
    setLoadingSale(true);
    const data = await getSale(orderId);
    if (data) {
      setFetchedSale(data);
      // Also fetch installments
      try {
        const instData = await api.sales.getInstallments(data.id);
        setInstallments(instData);
      } catch (e) {
        console.log('No installments found');
      }
    }
    setLoadingSale(false);
  };

  // Fetch installments when sale loads
  useEffect(() => {
    if (activeSale?.id && activeSale?.payment_type === 'installment') {
      setLoadingInstallments(true);
      api.sales.getInstallments(activeSale.id)
        .then(data => setInstallments(data))
        .catch(() => console.log('No installments'))
        .finally(() => setLoadingInstallments(false));
    }
  }, [activeSale?.id, activeSale?.payment_type]);

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

  const handleShare = async () => {
    if (!activeSale || !items) return;

    const shopName = shopInfo?.name || "Supashop Store";
    const date = new Date(activeSale.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

    // Construct simplified receipt text
    let text = `🧾 *RECEIPT from ${shopName}*\n\n`;
    text += `📅 Date: ${date}\n`;
    text += `🔢 Order ID: #${activeSale.order_id}\n`;
    text += `👤 Customer: ${activeSale.customer?.name || 'Walk-in'}\n\n`;

    text += `*ITEMS*\n`;
    items.forEach(item => {
      text += `${item.product} (x${item.quantity}) - ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(item.unitCost * item.quantity)}\n`;
    });

    text += `\n----------------\n`;
    text += `*TOTAL: ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(total)}*\n`;
    text += `----------------\n\n`;

    text += `*PAYMENT*\n`;
    text += `Status: ${activeSale.payment_status === 'pending' ? '⏳ Pending' : '✅ Paid'}\n`;
    text += `Paid: ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(activeSale.amount_paid || (activeSale.payment_status === 'completed' ? total : 0)))}\n`;

    if (Number(activeSale.outstanding_balance) > 0) {
      text += `Balance: ${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(activeSale.outstanding_balance))}\n`;
      text += `Please pay the balance to:\n${shopInfo?.name}\n`;
    }

    text += `\nThank you for your patronage! 🙏`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt #${activeSale.order_id}`,
          text: text,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Receipt copied to clipboard!");
    }
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
              <Badge
                variant="light"
                color={activeSale?.payment_status === 'pending' ? 'warning' : 'success'}
              >
                {activeSale?.payment_status === 'pending' ? 'Pending: payment not completed' : 'Completed'}
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
          {/* Record Payment button - only show for pending payments */}
          {activeSale?.payment_status === 'pending' && Number(activeSale?.outstanding_balance || 0) > 0 && (
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
              onClick={() => {
                setPaymentAmount(Number(activeSale.outstanding_balance || 0));
                setShowPaymentModal(true);
              }}
            >
              Record Payment
            </Button>
          )}
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
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
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

      {/* Payment Information Section (Hidden on Print) */}
      <div className="mt-5 no-print">
        <div className="rounded-2xl border border-gray-200 bg-white py-4 px-5 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-6">
          <div className="w-full mb-5">
            <h5 className="px-3 text-[20px] font-medium text-gray-800 dark:text-white/90">Payment Information</h5>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-3">
            {/* Payment Type */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Payment Type</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mt-1 capitalize">
                {activeSale?.payment_type || 'Full'} Payment
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Payment Method</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mt-1 capitalize">
                {(() => {
                  if (activeSale?.payment_type === 'installment' && installments.length > 0) {
                    const methods = Array.from(new Set(installments.map(i => i.paymentMethod?.replace('_', ' ') || 'Cash')));
                    return methods.length > 1 ? `Mixed (${methods.join(', ')})` : methods[0];
                  }
                  return activeSale?.payment_method?.replace('_', ' ') || 'Cash';
                })()}
              </div>
            </div>

            {/* Payment Status */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</div>
              <div className={`text-sm font-medium mt-1 ${activeSale?.payment_status === 'pending' ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                {activeSale?.payment_status === 'pending' ? 'Pending' : 'Completed'}
              </div>
            </div>

            {/* Bank Name (if bank transfer) */}
            {activeSale?.bank_name && (
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Bank Name</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {activeSale.bank_name}
                </div>
              </div>
            )}

            {/* Account Number (if provided) */}
            {activeSale?.account_number && (
              <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Account Number</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {activeSale.account_number}
                </div>
              </div>
            )}

            {/* Profit (Internal) - Hidden on Receipt */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800 print:hidden space-y-2">
              <div className="flex justify-between items-center">
                <div className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wide">Expected Profit</div>
                <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(activeSale?.expectedProfit || activeSale?.profit || 0))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-purple-200 dark:border-purple-800">
                <div className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wide">Realized Profit</div>
                <div className={`text-sm font-bold ${Number(activeSale?.realizedProfit || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                  {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(activeSale?.realizedProfit || 0))}
                </div>
              </div>

              <div className="text-[10px] text-center text-purple-400 dark:text-purple-300/60 pt-1">
                Margin: {Number(activeSale?.total_amount) > 0
                  ? Math.round((Number(activeSale?.expectedProfit || activeSale?.profit || 0) / Number(activeSale?.total_amount)) * 100)
                  : 0}%
              </div>
            </div>

            {/* Amount Paid */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Amount Paid</div>
              <div className="text-sm font-medium text-green-600 dark:text-green-400 mt-1">
                {new Intl.NumberFormat("en-NG", {
                  style: "currency",
                  currency: "NGN",
                }).format(Number(activeSale?.amount_paid || total))}
              </div>
            </div>

            {/* Outstanding Balance */}
            {Number(activeSale?.outstanding_balance || 0) > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wide">Outstanding Balance</div>
                <div className="text-sm font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {new Intl.NumberFormat("en-NG", {
                    style: "currency",
                    currency: "NGN",
                  }).format(Number(activeSale?.outstanding_balance || 0))}
                </div>
                <button
                  onClick={() => {
                    setPaymentAmount(Number(activeSale?.outstanding_balance || 0));
                    setShowPaymentModal(true);
                  }}
                  className="mt-2 text-xs w-full py-1 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/40 dark:hover:bg-orange-900/60 text-orange-700 dark:text-orange-300 rounded border border-orange-200 dark:border-orange-800 transition-colors"
                >
                  Mark as Paid
                </button>
              </div>
            )}
          </div>

          {/* Uploaded Receipt / Proof of Payment */}
          {activeSale?.proof_of_payment && (
            <div className="mt-6 px-3">
              <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Payment Receipt</h6>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <a
                  href={activeSale.proof_of_payment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
                    <img
                      src={activeSale.proof_of_payment}
                      alt="Payment Receipt"
                      className="w-full max-h-64 object-contain bg-white dark:bg-gray-900 group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                      <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-3 py-1 rounded-full">
                        Click to view full size
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                    Uploaded by customer
                  </p>
                </a>
              </div>
            </div>
          )}

          {/* Installment History */}
          {activeSale?.payment_type === 'installment' && (
            <div className="mt-6 px-3">
              <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Installment History</h6>
              {loadingInstallments ? (
                <div className="text-center py-4"><Spinner size="sm" /></div>
              ) : installments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-800">
                        <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-400">Date</th>
                        <th className="text-right p-2 font-medium text-gray-600 dark:text-gray-400">Amount</th>
                        <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-400">Method</th>
                        <th className="text-left p-2 font-medium text-gray-600 dark:text-gray-400">Bank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map((inst, idx) => (
                        <tr key={inst.id || idx} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="p-2 text-gray-700 dark:text-gray-300">
                            {new Date(inst.createdAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-2 text-right font-medium text-green-600 dark:text-green-400">
                            {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(inst.amount))}
                          </td>
                          <td className="p-2 text-gray-700 dark:text-gray-300 capitalize">
                            {inst.paymentMethod.replace('_', ' ')}
                          </td>
                          <td className="p-2 text-gray-500 dark:text-gray-400">
                            {inst.bankName || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No installments recorded yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90 mb-4">
              Record Payment
            </h2>

            <div className="space-y-4">
              {/* Outstanding Balance Info */}
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-3">
                <div className="text-sm text-orange-700 dark:text-orange-300">
                  Outstanding Balance: <strong>{new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(Number(activeSale?.outstanding_balance || 0))}</strong>
                </div>
              </div>

              {/* Amount to Pay */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount to Record <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                  max={Number(activeSale?.outstanding_balance || 0)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank_transfer' | 'card')}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>

              {/* Bank Details (shown for bank transfer) */}
              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. GTBank, Access Bank"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Account Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. 0123456789"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentAmount('');
                    setPaymentMethod('cash');
                    setBankName('');
                    setAccountNumber('');
                  }}
                  disabled={isSubmittingPayment}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={isSubmittingPayment || !paymentAmount || paymentAmount <= 0}
                  onClick={async () => {
                    if (!paymentAmount || paymentAmount <= 0) {
                      toast.error('Please enter a valid amount');
                      return;
                    }

                    try {
                      setIsSubmittingPayment(true);
                      await api.sales.updatePayment(activeSale!.id, {
                        amountPaid: paymentAmount as number,
                        paymentMethod,
                        bankName: paymentMethod === 'bank_transfer' ? bankName : undefined,
                        accountNumber: paymentMethod === 'bank_transfer' ? accountNumber : undefined,
                      });

                      toast.success('Payment recorded successfully!');
                      setShowPaymentModal(false);
                      setPaymentAmount('');
                      setPaymentMethod('cash');
                      setBankName('');
                      setAccountNumber('');

                      // Refetch sale data to update UI
                      await refetchSale();
                    } catch (error: any) {
                      console.error('Error recording payment:', error);
                      toast.error(error.message || 'Failed to record payment');
                    } finally {
                      setIsSubmittingPayment(false);
                    }
                  }}
                >
                  {isSubmittingPayment ? 'Recording...' : 'Confirm Payment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

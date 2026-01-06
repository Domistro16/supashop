import { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrinterIcon, DownloadIcon } from "lucide-react";
import api from "@/lib/api";
import { getShop } from "@/supabaseClient";

interface SaleItem {
  id: string;
  orderId: string;
  totalAmount: number | string;
  createdAt: string;
  staff?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    name: string;
    phone?: string;
  } | null;
}

export default function SalesReport() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    averageOrderValue: 0,
  });

  // Set default date range to current month
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  // Fetch sales when date range changes
  useEffect(() => {
    if (startDate && endDate) {
      fetchSales();
    }
  }, [startDate, endDate]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const allSales = await api.sales.getAll();

      // Filter sales by date range
      const filtered = allSales.filter((sale: any) => {
        const saleDate = new Date(sale.createdAt);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date

        return saleDate >= start && saleDate <= end;
      });

      setSales(filtered);

      // Calculate statistics
      const totalRevenue = filtered.reduce(
        (sum: number, sale: any) => sum + Number(sale.totalAmount),
        0
      );
      const totalSales = filtered.length;
      const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

      setStats({
        totalRevenue,
        totalSales,
        averageOrderValue,
      });
    } catch (error) {
      console.error("Failed to fetch sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const [shopInfo, setShopInfo] = useState<{ name: string, address: string, phone: string } | null>(null);

  useEffect(() => {
    const fetchShopInfo = async () => {
      // Try local storage first
      const savedShop = localStorage.getItem('current_shop')
        ? JSON.parse(localStorage.getItem('current_shop') || '{}')
        : null;

      if (savedShop) setShopInfo(savedShop);

      // Fetch fresh from API
      try {
        const shop = await getShop();
        if (shop) {
          const info = {
            name: shop.name,
            address: shop.address || '',
            phone: (shop as any).phone || ''
          };
          setShopInfo(info);
          localStorage.setItem('current_shop', JSON.stringify({ ...savedShop, ...info }));
        } else if (!savedShop) {
          setShopInfo({ name: 'SUPASHOP', address: 'Store Address', phone: '' });
        }
      } catch (e) {
        console.error("Failed to fetch shop info", e);
      }
    };
    fetchShopInfo();
  }, []);

  return (
    <div>
      <PageMeta
        title="Sales Report | SUPASHOP"
        description="Generate and export sales reports"
      />
      <PageBreadcrumb pageTitle="Sales Report" />

      {/* Print-only styles */}
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
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto !important;
            overflow: visible !important;
            color: black !important;
            background: white;
            padding: 20px;
          }
          .print-content * {
            visibility: visible !important;
            height: auto !important;
            overflow: visible !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-header {
            display: block !important;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #000;
          }
          .print-stats {
            display: flex !important; // Ensure flex works in print
            flex-direction: row !important;
            justify-content: space-between !important;
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background-color: #f9fafb !important;
            -webkit-print-color-adjust: exact;
          }
          .print-table {
            display: table !important;
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #e5e7eb;
            padding: 10px;
            text-align: left;
            font-size: 12px;
          }
          .print-table th {
            background-color: #374151 !important;
            color: white !important;
            font-weight: bold;
            -webkit-print-color-adjust: exact;
          }
          
          /* Hide the screen table inside print content if it was there (it's not, we have separate) */
        }
      `}</style>

      {/* Date Range Filter - No Print */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] py-4 px-4 sm:px-6 md:px-8 mb-6 no-print">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <PrinterIcon className="h-4 w-4" />
              Print Report
            </Button>
            <Button
              variant="default"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <DownloadIcon className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Print Content (Hidden on screen via Tailwind 'hidden', shown on print via CSS) */}
      <div className="print-content hidden">
        {/* Print Header */}
        <div className="print-header">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wide mb-1">
                {shopInfo?.name}
              </h1>
              <p className="text-sm text-gray-600">{shopInfo?.address}</p>
              {shopInfo?.phone && <p className="text-sm text-gray-600">Tel: {shopInfo?.phone}</p>}
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-800">SALES REPORT</h2>
              <p className="text-sm mt-1">Generated: {new Date().toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-dashed border-gray-300">
            <p className="text-sm"><strong>Reporting Period:</strong> {startDate ? formatDate(startDate + 'T00:00:00') : '-'} — {endDate ? formatDate(endDate + 'T23:59:59') : '-'}</p>
          </div>
        </div>

        {/* Print Stats */}
        <div className="print-stats">
          <div className="text-center">
            <strong className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Total Revenue</strong>
            <span className="text-xl font-bold">{formatCurrency(stats.totalRevenue)}</span>
          </div>
          <div className="text-center border-l border-gray-300 pl-8">
            <strong className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Total Sales</strong>
            <span className="text-xl font-bold">{stats.totalSales}</span>
          </div>
          <div className="text-center border-l border-gray-300 pl-8">
            <strong className="block text-gray-500 text-xs uppercase tracking-wider mb-1">Avg Order Value</strong>
            <span className="text-xl font-bold">{formatCurrency(stats.averageOrderValue)}</span>
          </div>
        </div>

        {/* Print Table */}
        <table className="print-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Staff</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>#{sale.orderId}</td>
                <td>{formatDate(sale.createdAt)}</td>
                <td>{sale.customer?.name || "-"}</td>
                <td>{sale.staff?.name || "-"}</td>
                <td className="text-right font-medium">{formatCurrency(Number(sale.totalAmount))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          End of Report
        </div>
      </div>

      {/* Screen Transactions Grid (Visible on screen, No Print) */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6 no-print">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Transactions
        </h2>

        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Loading sales data...
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No sales found for the selected date range.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Total Revenue
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Total Sales
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalSales}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                Average Order Value
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.averageOrderValue)}
              </p>
            </div>
          </div>
        )}

        {sales.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sold By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sold To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-white/[0.03] divide-y divide-gray-200 dark:divide-gray-800">
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      #{sale.orderId}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {formatCurrency(Number(sale.totalAmount))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {sale.staff?.name || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {sale.customer?.name || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(sale.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

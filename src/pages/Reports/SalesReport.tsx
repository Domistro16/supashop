import { useState, useEffect } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PrinterIcon, DownloadIcon } from "lucide-react";
import api from "@/lib/api";

interface SaleItem {
  id: string;
  orderId: string;
  totalAmount: number;
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
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  };

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
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-header {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #000;
          }
          .print-stats {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            padding: 10px;
            border: 1px solid #000;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          .print-table th {
            background-color: #f0f0f0;
          }
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

      {/* Print Content */}
      <div className="print-content">
        {/* Print Header */}
        <div className="print-header" style={{ display: 'none' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '10px', fontWeight: 'bold' }}>
            SUPASHOP - Sales Report
          </h1>
          <div style={{ fontSize: '14px' }}>
            <strong>Period:</strong> {startDate} to {endDate}
          </div>
          <div style={{ fontSize: '14px' }}>
            <strong>Generated:</strong> {new Date().toLocaleString()}
          </div>
        </div>

        {/* Statistics Cards */}
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

        {/* Print-only stats */}
        <div className="print-stats" style={{ display: 'none' }}>
          <div>
            <strong>Total Revenue:</strong><br />
            {formatCurrency(stats.totalRevenue)}
          </div>
          <div>
            <strong>Total Sales:</strong><br />
            {stats.totalSales}
          </div>
          <div>
            <strong>Average Order:</strong><br />
            {formatCurrency(stats.averageOrderValue)}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6">
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
            <>
              {/* Screen table */}
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

              {/* Print-only table */}
              <table className="print-table" style={{ display: 'none' }}>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Amount</th>
                    <th>Sold By</th>
                    <th>Sold To</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>#{sale.orderId}</td>
                      <td>{formatCurrency(Number(sale.totalAmount))}</td>
                      <td>{sale.staff?.name || "-"}</td>
                      <td>{sale.customer?.name || "-"}</td>
                      <td>{formatDate(sale.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

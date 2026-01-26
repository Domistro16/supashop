import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import PageMeta from "../../components/common/PageMeta";
import { Transaction } from "../Transaction/Columns";
import AIInsightsDashboard from "../../components/ai/AIInsightsDashboard";
import CustomerStats from "../../components/customers/CustomerStats";
import { useDataRefresh } from "../../context/DataRefreshContext";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/button";
import { RefreshCw } from "lucide-react";

function filterToday(sales: Transaction[]) {
  const now = new Date();

  // start of today
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  // end of today
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  return sales.filter((sale) => {
    const saleDate = new Date(sale.created_at);
    return saleDate >= startOfToday && saleDate < endOfToday;
  });
}

function filterYesterday(sales: Transaction[]) {
  const now = new Date();

  // start of today
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  // start of yesterday
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  return sales.filter((sale) => {
    const saleDate = new Date(sale.created_at);
    return saleDate >= startOfYesterday && saleDate < startOfToday;
  });
}

interface Product {
  id: string; // Unique identifier for each product
  name: string; // Product name
  variants: string; // Number of variants (e.g., "1 Variant", "2 Variants")
  category: string; // Category of the product
  price: number; // Price of the product (as a string with currency symbol)
  // status: string; // Status of the product
  /*   image: string; // URL or path to the product image */
}

export default function Home({
  sales,
  shop,
  items,
  stats,
}: {
  sales: Transaction[];
  shop: any;
  items: Product[];
  stats?: {
    revenue: number;
    profit: number;
    salesCount: number;
    revenueChange: number;
    profitChange: number;
    salesChange: number;
  };
}) {
  const { refreshAll } = useDataRefresh();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAll();
      toast.success("Dashboard data refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
      toast.error("Failed to refresh dashboard");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Provide defaults if stats failed to load (e.g. initial render or error)
  const defaults = {
    revenue: 0,
    profit: 0,
    salesCount: 0,
    revenueChange: 0,
    profitChange: 0,
    salesChange: 0,
  };

  const finalStats = stats || defaults;

  // Calculate total revenue from all sales for the MonthlyTarget comparison
  // (We might want to keep this simple or also fetch it, but usually 'rev' in MonthlyTarget is 'total historical revenue'?
  // Original code: 'rev = sales.reduce(...)'. Sales is ALL sales.
  // So let's keep 'rev' as Historical Revenue (Cash Basis)
  const rev = sales.reduce((sum, sale) => {
    return sum + Number(sale.amount_paid);
  }, 0);

  const salesPerMonth = sales.reduce((acc, sale) => {
    const date = new Date(sale.created_at);
    const month = date.getMonth(); // 0 = Jan, 1 = Feb...
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, Array(12).fill(0)); // initialize with 12 months (all 0)

  console.log(salesPerMonth);


  const recentOrders = [...sales]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <>
      <PageMeta
        title="Supashop Dashboard"
        description="This is the Ecommerce Dashboard page for your shop"
      />
      <div className="mb-3 sm:mb-4 flex justify-between items-center">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 text-xs sm:text-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>
      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        <div className="col-span-12 space-y-3 sm:space-y-4 xl:col-span-7">
          <EcommerceMetrics
            sales={finalStats.salesCount}
            revenue={finalStats.revenue}
            revenueChange={finalStats.revenueChange}
            salesChange={finalStats.salesChange}
            profit={finalStats.profit}
            profitChange={finalStats.profitChange}
          />

          <MonthlySalesChart sales={salesPerMonth as []} />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget revenue={rev} target={shop.target} today={finalStats.revenue} />
        </div>

        {/* Unified AI-Powered Insights Section */}
        <div className="col-span-12">
          <AIInsightsDashboard />
        </div>

        {/* Customer Management Section */}
        <div className="col-span-12">
          <CustomerStats />
        </div>

        <div className="col-span-12">
          <RecentOrders orders={recentOrders} />
        </div>
      </div>
    </>
  );
}

import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoxIconLine,
  GroupIcon,
} from "../../icons";
import Badge from "../ui/badge/Badge";
import { formatCurrency, formatPercentage } from "@/utils/formatters";

export default function EcommerceMetrics({
  sales,
  revenue,
  revenueChange,
  salesChange,
}: {
  sales: number;
  revenue: number;
  revenueChange: number;
  salesChange: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {/* <!-- Metric Item Start --> */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-lg dark:bg-gray-800">
            <GroupIcon className="text-gray-800 size-4 sm:size-5 dark:text-white/90" />
          </div>
          <Badge color={salesChange > 0 ? "success" : "error"} className="text-xs">
            {salesChange > 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {formatPercentage(salesChange)}
          </Badge>
        </div>

        <div className="mt-3">
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Today's Sales
          </span>
          <h4 className="mt-1 font-bold text-gray-800 text-xl sm:text-2xl dark:text-white/90">
            {sales}
          </h4>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}

      {/* <!-- Metric Item Start --> */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-lg dark:bg-gray-800">
            <BoxIconLine className="text-gray-800 size-4 sm:size-5 dark:text-white/90" />
          </div>
          <Badge color={revenueChange > 0 ? "success" : "error"} className="text-xs">
            {revenueChange > 0 ? <ArrowUpIcon /> : <ArrowDownIcon />}
            {formatPercentage(revenueChange)}
          </Badge>
        </div>

        <div className="mt-3">
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Today's Revenue
          </span>
          <h4 className="mt-1 font-bold text-gray-800 text-xl sm:text-2xl dark:text-white/90">
            {formatCurrency(revenue)}
          </h4>
        </div>
      </div>
      {/* <!-- Metric Item End --> */}
    </div>
  );
}

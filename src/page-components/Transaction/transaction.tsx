import ComponentCard from "@/components/common/ComponentCard";
import { columns, Transaction } from "./Columns";
import { DataTable } from "./DataTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDataRefresh } from "@/context/DataRefreshContext";
import { FileText, LayoutGrid, RefreshCw, Table as TableIcon } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "@/lib/react-router-compat";

type ViewMode = "cards" | "table";

const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
});

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatDateLabel(dateValue: string) {
  const date = new Date(dateValue);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return new Intl.DateTimeFormat("en-NG", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function getInitials(text?: string | null) {
  if (!text) return "TX";
  const parts = text.trim().split(" ");
  const first = parts[0]?.[0];
  const last = parts[parts.length - 1]?.[0];
  return `${first ?? ""}${last ?? ""}`.toUpperCase() || "TX";
}

function TransactionCard({
  tx,
  onOpen,
}: {
  tx: Transaction;
  onOpen: (orderId: string) => void;
}) {
  const dateLabel = formatDateLabel(tx.created_at);
  const customerName = tx.customer?.name || "Walk-in customer";
  return (
    <div className="rounded-xl border border-gray-200 bg-white/90 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.03] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div className="flex items-center gap-3 sm:gap-4 flex-1">
        <div className="h-11 w-11 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-100 flex items-center justify-center font-semibold text-sm">
          {getInitials(customerName)}
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
              #{tx.order_id}
            </p>
            <Badge variant="secondary" className="text-[11px]">
              {dateLabel}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {customerName}
            {tx.customer?.phone ? ` • ${tx.customer.phone}` : ""}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Sold by {tx.staff_id || "—"}
          </p>
        </div>
      </div>
      <div className="flex items-start sm:items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
        <div className="text-right">
          <p className="text-lg sm:text-xl font-semibold text-emerald-600 dark:text-emerald-400">
            {currencyFormatter.format(Number(tx.total_amount || 0))}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {dateFormatter.format(new Date(tx.created_at))}
          </p>
        </div>
        <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => onOpen(tx.order_id)}>
          View
        </Button>
      </div>
    </div>
  );
}

export default function Transactions({ sales }: { sales: Transaction[] }) {
  const navigate = useNavigate();
  const { refreshSales } = useDataRefresh();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [searchTerm, setSearchTerm] = useState("");

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSales();
      toast.success("Transactions refreshed successfully!");
    } catch (error) {
      console.error("Error refreshing transactions:", error);
      toast.error("Failed to refresh transactions");
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredSales = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return sales;
    return sales.filter((tx) => {
      const customer = tx.customer?.name?.toLowerCase() || "";
      const phone = tx.customer?.phone?.toLowerCase() || "";
      return (
        tx.order_id?.toLowerCase().includes(term) ||
        tx.staff_id?.toLowerCase().includes(term) ||
        customer.includes(term) ||
        phone.includes(term)
      );
    });
  }, [sales, searchTerm]);

  const sortedSales = useMemo(
    () => [...filteredSales].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [filteredSales]
  );

  const totalVolume = useMemo(
    () => filteredSales.reduce((sum, tx) => sum + Number(tx.total_amount || 0), 0),
    [filteredSales]
  );

  return (
    <div className="container mx-auto py-3 sm:py-5">
      <PageMeta title="Transactions | Supashop" description="View and manage all store transactions" />
      <PageBreadcrumb pageTitle="Transactions" />

      {/* Actions */}
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-end gap-2">
        <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg p-1 w-full sm:w-auto">
          <Button
            variant={viewMode === "cards" ? "default" : "ghost"}
            className="flex-1 sm:flex-none text-xs sm:text-sm"
            onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            App view
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            className="flex-1 sm:flex-none text-xs sm:text-sm"
            onClick={() => setViewMode("table")}
          >
            <TableIcon className="h-4 w-4 mr-2" />
            Table
          </Button>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="flex-1 sm:flex-none flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => navigate("/reports/sales")}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Generate Sales Report
          </Button>
        </div>
      </div>

      {viewMode === "table" ? (
        <DataTable columns={columns} data={sales} />
      ) : (
        <ComponentCard title="Transaction activity" desc="Mobile-inspired feed with quick context">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 flex-1">
              <div className="rounded-lg border border-gray-100 dark:border-white/[0.06] bg-blue-50/70 dark:bg-blue-900/20 p-3">
                <p className="text-[11px] uppercase tracking-wide text-blue-700 dark:text-blue-200">Transactions</p>
                <p className="text-lg font-semibold text-blue-900 dark:text-blue-50">{filteredSales.length}</p>
              </div>
              <div className="rounded-lg border border-gray-100 dark:border-white/[0.06] bg-emerald-50/80 dark:bg-emerald-900/20 p-3">
                <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-200">Volume</p>
                <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-50">
                  {currencyFormatter.format(totalVolume)}
                </p>
              </div>
              <div className="rounded-lg border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-gray-800/40 p-3 col-span-2 sm:col-span-1">
                <p className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-300">Filter</p>
                <Input
                  placeholder="Search by customer, order, phone"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-1 h-9 text-sm dark:bg-gray-900"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {sortedSales.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No transactions match your search yet.
              </div>
            ) : (
              sortedSales.map((tx, index) => {
                const dateLabel = formatDateLabel(tx.created_at);
                const previousDateLabel =
                  index > 0 ? formatDateLabel(sortedSales[index - 1].created_at) : null;
                const showDivider = dateLabel !== previousDateLabel;
                return (
                  <div key={tx.id} className="space-y-2">
                    {showDivider && (
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <span className="h-px flex-1 bg-gray-200 dark:bg-white/[0.08]" />
                        <span>{dateLabel}</span>
                        <span className="h-px flex-1 bg-gray-200 dark:bg-white/[0.08]" />
                      </div>
                    )}
                    <TransactionCard tx={tx} onOpen={(orderId) => navigate(`/sales/${orderId}`)} />
                  </div>
                );
              })
            )}
          </div>
        </ComponentCard>
      )}
    </div>
  );
}

import ComponentCard from "@/components/common/ComponentCard";
import { columns, Transaction } from "./Columns";
import { DataTable } from "./DataTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Button } from "@/components/ui/button";
import { FileText, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router";
import { useDataRefresh } from "@/context/DataRefreshContext";
import { useState } from "react";
import toast from "react-hot-toast";


export default function Transactions({sales} : {sales: Transaction[]}) {
  const navigate = useNavigate();
  const { refreshSales } = useDataRefresh();
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  return (
    <div className="container mx-auto py-10">
      <PageBreadcrumb pageTitle="Transactions" />

      {/* Sales Report Button */}
      <div className="mb-6 flex justify-end gap-3">
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <Button
          onClick={() => navigate("/reports/sales")}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Generate Sales Report
        </Button>
      </div>

      <DataTable columns={columns} data={sales} />
    </div>
  );
}

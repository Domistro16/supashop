import ComponentCard from "@/components/common/ComponentCard";
import { columns, Transaction } from "./Columns";
import { DataTable } from "./DataTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router";


export default function Transactions({sales} : {sales: Transaction[]}) {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-10">
      <PageBreadcrumb pageTitle="Transactions" />

      {/* Sales Report Button */}
      <div className="mb-6 flex justify-end">
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

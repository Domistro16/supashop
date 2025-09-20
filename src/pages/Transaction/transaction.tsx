import ComponentCard from "@/components/common/ComponentCard";
import { columns, Transaction } from "./Columns";
import { DataTable } from "./DataTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";


export default function Transactions({sales} : {sales: Transaction[]}) {
  return (
    <div className="container mx-auto py-10">
      <PageBreadcrumb pageTitle="Transactions" />
        <DataTable columns={columns} data={sales} />
    </div>
  );
}

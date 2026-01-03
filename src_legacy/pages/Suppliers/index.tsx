import PageMeta from "@/components/common/PageMeta";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SupplierList from "@/components/suppliers/SupplierList";

export default function SuppliersPage() {
  return (
    <div>
      <PageMeta
        title="Suppliers | SUPASHOP"
        description="Manage your suppliers"
      />
      <PageBreadcrumb pageTitle="Suppliers" />
      <SupplierList />
    </div>
  );
}

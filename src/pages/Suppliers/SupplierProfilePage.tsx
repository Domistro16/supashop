import PageMeta from "@/components/common/PageMeta";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SupplierProfile from "@/components/suppliers/SupplierProfile";

export default function SupplierProfilePage() {
  return (
    <div>
      <PageMeta
        title="Supplier Details | SUPASHOP"
        description="View supplier information"
      />
      <PageBreadcrumb pageTitle="Supplier Details" />
      <SupplierProfile />
    </div>
  );
}

import PageMeta from "@/components/common/PageMeta";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SupplierForm from "@/components/suppliers/SupplierForm";

export default function SupplierFormPage() {
  return (
    <div>
      <PageMeta
        title="Supplier Form | SUPASHOP"
        description="Add or edit supplier"
      />
      <PageBreadcrumb pageTitle="Supplier Form" />
      <SupplierForm />
    </div>
  );
}

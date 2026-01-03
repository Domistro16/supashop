import { useState, useEffect } from "react";
import { useNavigate, useParams } from "@/lib/react-router-compat";
import api, { Supplier } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  User,
  Package,
  Calendar,
  DollarSign,
} from "lucide-react";

export default function SupplierProfile() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchSupplier(id);
    }
  }, [id]);

  const fetchSupplier = async (supplierId: string) => {
    try {
      const { supplier: fetchedSupplier } = await api.suppliers.getById(
        supplierId
      );
      setSupplier(fetchedSupplier);
    } catch (error) {
      console.error("Failed to fetch supplier:", error);
      alert("Failed to load supplier");
      navigate("/suppliers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!supplier || !id) return;

    if (
      !confirm(
        "Are you sure you want to delete this supplier? This action cannot be undone."
      )
    )
      return;

    try {
      await api.suppliers.delete(id);
      navigate("/suppliers");
    } catch (error: any) {
      alert(error.message || "Failed to delete supplier");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-gray-400">
          Loading supplier...
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-gray-400">
          Supplier not found
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/suppliers")}
            className="text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {supplier.name}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Supplier Details
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/suppliers/${id}/edit`)}
            className="text-blue-600 dark:text-blue-400 dark:border-gray-700"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            className="text-red-600 dark:text-red-400 dark:border-gray-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Products Supplied
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {supplier._count?.products || 0}
              </p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Orders
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {supplier.totalOrders}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Spent
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(Number(supplier.totalSpent))}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Contact Information
        </h3>
        <div className="space-y-3">
          {supplier.contactPerson && (
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Contact Person
                </p>
                <p>{supplier.contactPerson}</p>
              </div>
            </div>
          )}

          {supplier.email && (
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Email
                </p>
                <a
                  href={`mailto:${supplier.email}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {supplier.email}
                </a>
              </div>
            </div>
          )}

          {supplier.phone && (
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Phone
                </p>
                <a
                  href={`tel:${supplier.phone}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {supplier.phone}
                </a>
              </div>
            </div>
          )}

          {supplier.address && (
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
              <MapPin className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Address
                </p>
                <p>{supplier.address}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-white dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Additional Information
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Last Order
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              {supplier.lastOrder ? formatDate(supplier.lastOrder) : "Never"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Added On
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              {formatDate(supplier.createdAt)}
            </p>
          </div>

          {supplier.notes && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Notes
              </p>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {supplier.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

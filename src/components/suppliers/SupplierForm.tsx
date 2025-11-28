import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import api, { Supplier } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, ArrowLeft } from "lucide-react";

interface SupplierFormProps {
  supplierId?: string;
}

export default function SupplierForm({ supplierId }: SupplierFormProps) {
  const navigate = useNavigate();
  const params = useParams();
  const editId = supplierId || params.id;
  const isEdit = Boolean(editId && editId !== "new");

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    if (isEdit && editId && editId !== "new") {
      fetchSupplier(editId);
    }
  }, [editId, isEdit]);

  const fetchSupplier = async (id: string) => {
    try {
      const { supplier } = await api.suppliers.getById(id);
      setFormData({
        name: supplier.name,
        contactPerson: supplier.contactPerson || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        notes: supplier.notes || "",
      });
    } catch (error) {
      console.error("Failed to fetch supplier:", error);
      alert("Failed to load supplier");
      navigate("/suppliers");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert("Supplier name is required");
      return;
    }

    try {
      setLoading(true);

      if (isEdit && editId && editId !== "new") {
        await api.suppliers.update(editId, formData);
      } else {
        await api.suppliers.create(formData);
      }

      navigate("/suppliers");
    } catch (error: any) {
      alert(error.message || "Failed to save supplier");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
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
            {isEdit ? "Edit Supplier" : "Add New Supplier"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {isEdit
              ? "Update supplier information"
              : "Create a new supplier record"}
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-white/[0.03] rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-6"
      >
        {/* Supplier Name */}
        <div className="space-y-2">
          <Label
            htmlFor="name"
            className="text-gray-700 dark:text-gray-300"
          >
            Supplier Name *
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter supplier name"
            className="dark:bg-gray-800 dark:text-white dark:border-gray-700"
          />
        </div>

        {/* Contact Person */}
        <div className="space-y-2">
          <Label
            htmlFor="contactPerson"
            className="text-gray-700 dark:text-gray-300"
          >
            Contact Person
          </Label>
          <Input
            id="contactPerson"
            name="contactPerson"
            type="text"
            value={formData.contactPerson}
            onChange={handleChange}
            placeholder="Enter contact person name"
            className="dark:bg-gray-800 dark:text-white dark:border-gray-700"
          />
        </div>

        {/* Email and Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-gray-700 dark:text-gray-300"
            >
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="supplier@example.com"
              className="dark:bg-gray-800 dark:text-white dark:border-gray-700"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="phone"
              className="text-gray-700 dark:text-gray-300"
            >
              Phone
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+234 800 000 0000"
              className="dark:bg-gray-800 dark:text-white dark:border-gray-700"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label
            htmlFor="address"
            className="text-gray-700 dark:text-gray-300"
          >
            Address
          </Label>
          <Input
            id="address"
            name="address"
            type="text"
            value={formData.address}
            onChange={handleChange}
            placeholder="Enter supplier address"
            className="dark:bg-gray-800 dark:text-white dark:border-gray-700"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label
            htmlFor="notes"
            className="text-gray-700 dark:text-gray-300"
          >
            Notes
          </Label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any additional notes about this supplier..."
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/suppliers")}
            disabled={loading}
            className="dark:border-gray-700 dark:text-gray-300"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : isEdit ? "Update Supplier" : "Add Supplier"}
          </Button>
        </div>
      </form>
    </div>
  );
}

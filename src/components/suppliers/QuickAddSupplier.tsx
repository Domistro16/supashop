import { useState } from 'react';
import { createPortal } from 'react-dom';
import api, { Supplier } from '../../lib/api';
import { toast } from 'react-hot-toast';

interface QuickAddSupplierProps {
  onSuccess: (supplier: Supplier) => void;
  onCancel: () => void;
  initialName?: string;
}

export default function QuickAddSupplier({ onSuccess, onCancel, initialName = '' }: QuickAddSupplierProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialName,
    contactPerson: '',
    phone: '',
    email: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to parent form

    if (!formData.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }

    try {
      setLoading(true);
      const data = await api.suppliers.create({
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
      });
      toast.success('Supplier added successfully');
      onSuccess(data.supplier);
    } catch (error: any) {
      console.error('Quick add supplier error:', error);
      toast.error(error.message || 'Failed to add supplier');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90 mb-4">Quick Add Supplier</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="quick-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Supplier Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="quick-name"
              autoFocus
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Supplier name"
            />
          </div>

          <div>
            <label htmlFor="quick-contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Contact Person (optional)
            </label>
            <input
              type="text"
              id="quick-contact"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              className="mt-1 block w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Contact person name"
            />
          </div>

          <div>
            <label htmlFor="quick-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone (optional)
            </label>
            <input
              type="tel"
              id="quick-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="mt-1 block w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Phone number"
            />
          </div>

          <div>
            <label htmlFor="quick-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email (optional)
            </label>
            <input
              type="email"
              id="quick-email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Email address"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

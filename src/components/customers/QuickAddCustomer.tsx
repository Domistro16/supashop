import { useState } from 'react';
import api, { Customer } from '../../lib/api';
import { toast } from 'react-hot-toast';

interface QuickAddCustomerProps {
  onSuccess: (customer: Customer) => void;
  onCancel: () => void;
}

export default function QuickAddCustomer({ onSuccess, onCancel }: QuickAddCustomerProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      setLoading(true);
      const data = await api.customers.create({
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
      });
      toast.success('Customer added successfully');
      onSuccess(data.customer);
    } catch (error: any) {
      console.error('Quick add customer error:', error);
      toast.error(error.message || 'Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90 mb-4">Quick Add Customer</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="quick-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="quick-name"
              autoFocus
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Customer name"
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
              className="mt-1 block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Phone number"
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
              {loading ? 'Adding...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

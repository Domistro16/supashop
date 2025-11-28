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
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Add Customer</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="quick-name" className="block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="quick-name"
              autoFocus
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Customer name"
            />
          </div>

          <div>
            <label htmlFor="quick-phone" className="block text-sm font-medium text-gray-700">
              Phone (optional)
            </label>
            <input
              type="tel"
              id="quick-phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Phone number"
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
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

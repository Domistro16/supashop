import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/react-router-compat';
import api, { Customer } from '../../lib/api';
import { toast } from 'react-hot-toast';

interface CustomerFormProps {
  customerId?: string;
  onSuccess?: (customer: Customer) => void;
  onCancel?: () => void;
}

export default function CustomerForm({ customerId, onSuccess, onCancel }: CustomerFormProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (customerId) {
      loadCustomer();
    }
  }, [customerId]);

  const loadCustomer = async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      const data = await api.customers.getById(customerId);
      setFormData({
        name: data.customer.name,
        email: data.customer.email || '',
        phone: data.customer.phone || '',
        address: data.customer.address || '',
        notes: data.customer.notes || '',
        tags: data.customer.tags,
      });
    } catch (error) {
      console.error('Load customer error:', error);
      toast.error('Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      setLoading(true);
      const data = {
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        tags: formData.tags,
      };

      let customer: Customer;
      if (customerId) {
        const result = await api.customers.update(customerId, data);
        customer = result.customer;
        toast.success('Customer updated successfully');
      } else {
        const result = await api.customers.create(data);
        customer = result.customer;
        toast.success('Customer created successfully');
      }

      if (onSuccess) {
        onSuccess(customer);
      } else {
        navigate('/customers');
      }
    } catch (error: any) {
      console.error('Save customer error:', error);
      toast.error(error.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/customers');
    }
  };

  if (loading && customerId) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-white/[0.03] shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">
          {customerId ? 'Edit Customer' : 'Add New Customer'}
        </h2>

        {/* Name - Required */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Address
          </label>
          <textarea
            id="address"
            rows={3}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Internal notes about this customer..."
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tags</label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add a tag (e.g., VIP, Wholesale)"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Add
            </button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
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
          {loading ? 'Saving...' : customerId ? 'Update Customer' : 'Create Customer'}
        </button>
      </div>
    </form>
  );
}

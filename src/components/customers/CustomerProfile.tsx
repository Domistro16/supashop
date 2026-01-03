import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/react-router-compat';
import api, { Customer } from '../../lib/api';
import { formatCurrency, formatTimeAgo } from '../../utils/formatters';
import { toast } from 'react-hot-toast';

interface CustomerProfileProps {
  customerId: string;
}

export default function CustomerProfile({ customerId }: CustomerProfileProps) {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const data = await api.customers.getById(customerId);
      setCustomer(data.customer);
    } catch (error) {
      console.error('Load customer error:', error);
      toast.error('Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-300';
      case 'gold':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300';
      case 'silver':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-white/[0.03] shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span className="text-3xl text-blue-600 dark:text-blue-300 font-medium">
                {customer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90">{customer.name}</h1>
              {customer.loyaltyPoint && (
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getTierBadgeColor(
                      customer.loyaltyPoint.tier
                    )}`}
                  >
                    {customer.loyaltyPoint.tier.toUpperCase()} MEMBER
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {customer.loyaltyPoint.points} points
                  </span>
                </div>
              )}
              {customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {customer.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate(`/customers/${customerId}/edit`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit Customer
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-white/[0.03] shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white/90 mt-1">
            {formatCurrency(customer.totalSpent)}
          </p>
        </div>
        <div className="bg-white dark:bg-white/[0.03] shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Visits</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white/90 mt-1">{customer.visitCount}</p>
        </div>
        <div className="bg-white dark:bg-white/[0.03] shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Last Visit</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white/90 mt-1">
            {customer.lastVisit ? formatTimeAgo(customer.lastVisit) : 'Never'}
          </p>
        </div>
        <div className="bg-white dark:bg-white/[0.03] shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Order Value</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white/90 mt-1">
            {customer.visitCount > 0
              ? formatCurrency(customer.totalSpent / customer.visitCount)
              : formatCurrency(0)}
          </p>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white dark:bg-white/[0.03] shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90 mb-4">Contact Information</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white/90">{customer.email || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white/90">{customer.phone || '-'}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white/90">{customer.address || '-'}</dd>
          </div>
        </dl>
      </div>

      {/* Notes */}
      {customer.notes && (
        <div className="bg-white dark:bg-white/[0.03] shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90 mb-4">Notes</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{customer.notes}</p>
        </div>
      )}

      {/* Recent Sales */}
      {customer._count && customer._count.sales > 0 && (
        <div className="bg-white dark:bg-white/[0.03] shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90 mb-4">
            Recent Purchases ({customer._count.sales} total)
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Purchase history integration coming soon...
          </p>
        </div>
      )}

      {/* Account Info */}
      <div className="bg-white dark:bg-white/[0.03] shadow rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90 mb-4">Account Information</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Since</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white/90">{formatTimeAgo(customer.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white/90">{formatTimeAgo(customer.updatedAt)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

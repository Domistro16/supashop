import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { Customer } from '../../lib/api';
import { formatCurrency, formatTimeAgo } from '../../utils/formatters';
import { toast } from 'react-hot-toast';

interface CustomerListProps {
  onSelectCustomer?: (customer: Customer) => void;
  compact?: boolean;
}

export default function CustomerList({ onSelectCustomer, compact = false }: CustomerListProps) {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadCustomers();
  }, [search, sortBy, sortOrder]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.customers.getAll({
        search: search || undefined,
        sortBy,
        sortOrder,
      });
      setCustomers(data.customers);
    } catch (error) {
      console.error('Load customers error:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      await api.customers.delete(id);
      toast.success('Customer deleted successfully');
      loadCustomers();
    } catch (error) {
      console.error('Delete customer error:', error);
      toast.error('Failed to delete customer');
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return 'bg-purple-100 text-purple-800';
      case 'gold':
        return 'bg-yellow-100 text-yellow-800';
      case 'silver':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-orange-100 text-orange-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search customers by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="createdAt">Date Added</option>
            <option value="name">Name</option>
            <option value="totalSpent">Total Spent</option>
            <option value="visitCount">Visit Count</option>
            <option value="lastVisit">Last Visit</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Customers Table */}
      {customers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No customers found</p>
          {!compact && (
            <button
              onClick={() => navigate('/customers/new')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Customer
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  {!compact && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Loyalty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Spent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Visits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Visit
                      </th>
                    </>
                  )}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className={onSelectCustomer ? 'cursor-pointer hover:bg-gray-50' : ''}
                    onClick={() => onSelectCustomer?.(customer)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          {customer.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {customer.tags.slice(0, 2).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.phone || '-'}</div>
                      <div className="text-sm text-gray-500">{customer.email || '-'}</div>
                    </td>
                    {!compact && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {customer.loyaltyPoint && (
                            <div>
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTierBadgeColor(
                                  customer.loyaltyPoint.tier
                                )}`}
                              >
                                {customer.loyaltyPoint.tier.toUpperCase()}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                {customer.loyaltyPoint.points} pts
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(customer.totalSpent)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {customer.visitCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.lastVisit ? formatTimeAgo(customer.lastVisit) : 'Never'}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${customer.id}`);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${customer.id}/edit`);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(customer.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

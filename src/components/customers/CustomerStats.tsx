import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/react-router-compat';
import api, { CustomerStats as CustomerStatsType } from '../../lib/api';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'react-hot-toast';

export default function CustomerStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<CustomerStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.customers.getStats();
      setStats(data);
    } catch (error) {
      console.error('Load customer stats error:', error);
      toast.error('Failed to load customer statistics');
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
      <div className="bg-white dark:bg-white/[0.03] shadow rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white dark:bg-white/[0.03] shadow rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Customers</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white/90 mt-0.5">{stats.totalCustomers}</p>
            </div>
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.03] shadow rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">New</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white/90 mt-0.5">
                {stats.newCustomersThisMonth}
              </p>
            </div>
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-white/[0.03] shadow rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Avg. Value</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white/90 mt-0.5">
                {formatCurrency(stats.avgCustomerValue)}
              </p>
            </div>
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Top Customers */}
        <div className="bg-white dark:bg-white/[0.03] shadow rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white/90">Top Customers</h3>
            <button
              onClick={() => navigate('/customers')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              View All
            </button>
          </div>
          {stats.topCustomers.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">No customers yet</p>
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              {stats.topCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
                >
                  <div className="flex items-center min-w-0">
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs sm:text-sm text-blue-600 dark:text-blue-300 font-medium">
                        {customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-2 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white/90 truncate">{customer.name}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{customer.visitCount} visits</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white/90">
                      {formatCurrency(customer.totalSpent)}
                    </p>
                    {customer.loyaltyPoint && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${getTierBadgeColor(
                          customer.loyaltyPoint.tier
                        )}`}
                      >
                        {customer.loyaltyPoint.tier}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loyalty Tier Distribution */}
        <div className="bg-white dark:bg-white/[0.03] shadow rounded-xl border border-gray-200 dark:border-gray-800 p-3 sm:p-4">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white/90 mb-2 sm:mb-3">Loyalty Tiers</h3>
          {stats.loyaltyTierDistribution.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">No loyalty data yet</p>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {stats.loyaltyTierDistribution.map((tier) => {
                const percentage =
                  stats.totalCustomers > 0
                    ? Math.round((tier._count.tier / stats.totalCustomers) * 100)
                    : 0;

                return (
                  <div key={tier.tier}>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full ${getTierBadgeColor(
                          tier.tier
                        )}`}
                      >
                        {tier.tier.toUpperCase()}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                        {tier._count.tier} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${
                          tier.tier === 'platinum'
                            ? 'bg-purple-600'
                            : tier.tier === 'gold'
                            ? 'bg-yellow-600'
                            : tier.tier === 'silver'
                            ? 'bg-gray-600'
                            : 'bg-orange-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

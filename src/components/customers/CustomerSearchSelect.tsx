import { useState, useEffect, useRef } from 'react';
import api, { Customer } from '../../lib/api';
import QuickAddCustomer from './QuickAddCustomer';

interface CustomerSearchSelectProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  placeholder?: string;
}

export default function CustomerSearchSelect({
  selectedCustomer,
  onSelectCustomer,
  placeholder = "Search customer or type to add new...",
}: CustomerSearchSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchTerm) {
      searchCustomers();
    } else {
      setCustomers([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.customers.getAll({ search: searchTerm });
      setCustomers(data.customers);
      setIsOpen(true);
    } catch (error) {
      console.error('Search customers error:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    setSearchTerm(customer.name);
    setIsOpen(false);
  };

  const handleClearCustomer = () => {
    onSelectCustomer(null);
    setSearchTerm('');
    setCustomers([]);
  };

  const handleQuickAddSuccess = (customer: Customer) => {
    setShowQuickAdd(false);
    handleSelectCustomer(customer);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={selectedCustomer ? selectedCustomer.name : searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (selectedCustomer) {
                onSelectCustomer(null);
              }
            }}
            onFocus={() => {
              if (searchTerm) {
                setIsOpen(true);
              }
            }}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
          />
          {selectedCustomer && (
            <button
              type="button"
              onClick={handleClearCustomer}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowQuickAdd(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
        >
          + New
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && !selectedCustomer && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          ) : customers.length > 0 ? (
            <div>
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="font-medium text-gray-900 dark:text-white/90">
                    {customer.name}
                  </div>
                  {customer.phone && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {customer.phone}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : searchTerm ? (
            <div className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                No customers found for "{searchTerm}"
              </p>
              <button
                type="button"
                onClick={() => setShowQuickAdd(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Create new customer "{searchTerm}"
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Customer Info Badge */}
      {selectedCustomer && (
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm">
          <span className="font-medium">{selectedCustomer.name}</span>
          {selectedCustomer.phone && (
            <span className="text-blue-600 dark:text-blue-400">• {selectedCustomer.phone}</span>
          )}
          {selectedCustomer.loyaltyPoint && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-semibold">
              {selectedCustomer.loyaltyPoint.tier.toUpperCase()}
            </span>
          )}
        </div>
      )}

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <QuickAddCustomer
          onSuccess={handleQuickAddSuccess}
          onCancel={() => setShowQuickAdd(false)}
          initialName={searchTerm}
        />
      )}
    </div>
  );
}

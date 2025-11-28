import { useState, useEffect, useRef } from 'react';
import api, { Supplier } from '../../lib/api';
import QuickAddSupplier from './QuickAddSupplier';

interface SupplierSearchSelectProps {
  selectedSupplier: Supplier | null;
  onSelectSupplier: (supplier: Supplier | null) => void;
  placeholder?: string;
}

export default function SupplierSearchSelect({
  selectedSupplier,
  onSelectSupplier,
  placeholder = "Search supplier or type to add new...",
}: SupplierSearchSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchTerm) {
      searchSuppliers();
    } else {
      setSuppliers([]);
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

  const searchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await api.suppliers.getAll({ search: searchTerm });
      setSuppliers(data.suppliers);
      setIsOpen(true);
    } catch (error) {
      console.error('Search suppliers error:', error);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSupplier = (supplier: Supplier) => {
    onSelectSupplier(supplier);
    setSearchTerm(supplier.name);
    setIsOpen(false);
  };

  const handleClearSupplier = () => {
    onSelectSupplier(null);
    setSearchTerm('');
    setSuppliers([]);
  };

  const handleQuickAddSuccess = (supplier: Supplier) => {
    setShowQuickAdd(false);
    handleSelectSupplier(supplier);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={selectedSupplier ? selectedSupplier.name : searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (selectedSupplier) {
                onSelectSupplier(null);
              }
            }}
            onFocus={() => {
              if (searchTerm) {
                setIsOpen(true);
              }
            }}
            placeholder={placeholder}
            className="w-full h-10 px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
          />
          {selectedSupplier && (
            <button
              type="button"
              onClick={handleClearSupplier}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg"
            >
              ×
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowQuickAdd(true)}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap h-10"
        >
          + New
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && !selectedSupplier && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          ) : suppliers.length > 0 ? (
            <div>
              {suppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => handleSelectSupplier(supplier)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <div className="font-medium text-gray-900 dark:text-white/90">
                    {supplier.name}
                  </div>
                  {(supplier.contactPerson || supplier.phone) && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {supplier.contactPerson && supplier.contactPerson}
                      {supplier.contactPerson && supplier.phone && ' • '}
                      {supplier.phone && supplier.phone}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : searchTerm ? (
            <div className="p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                No suppliers found for "{searchTerm}"
              </p>
              <button
                type="button"
                onClick={() => setShowQuickAdd(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Create new supplier "{searchTerm}"
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Supplier Info Badge */}
      {selectedSupplier && (
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-sm">
          <span className="font-medium">{selectedSupplier.name}</span>
          {selectedSupplier.contactPerson && (
            <span className="text-green-600 dark:text-green-400">• {selectedSupplier.contactPerson}</span>
          )}
          {selectedSupplier.phone && (
            <span className="text-green-600 dark:text-green-400">• {selectedSupplier.phone}</span>
          )}
        </div>
      )}

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <QuickAddSupplier
          onSuccess={handleQuickAddSuccess}
          onCancel={() => setShowQuickAdd(false)}
          initialName={searchTerm}
        />
      )}
    </div>
  );
}

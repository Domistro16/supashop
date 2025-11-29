import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Product } from '@/pages/Products/Columns';
import { Customer } from '@/lib/api';
import CustomerSearchSelect from '@/components/customers/CustomerSearchSelect';
import { record_sale } from '@/supabaseClient';
import { toast } from 'react-hot-toast';

interface QuickSellProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickSell({ product, onClose, onSuccess }: QuickSellProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (quantity < 1 || quantity > product.stock) {
      toast.error(`Quantity must be between 1 and ${product.stock}`);
      return;
    }

    try {
      setLoading(true);
      const success = await record_sale(
        [{
          product: product.id,
          quantity: quantity,
          unitCost: Number(product.price),
        }],
        selectedCustomer?.id
      );

      if (success) {
        toast.success(`Sold ${quantity} ${product.name}${selectedCustomer ? ` to ${selectedCustomer.name}` : ''}`);
        onSuccess();
        onClose();
      } else {
        toast.error('Failed to record sale');
      }
    } catch (error: any) {
      console.error('Quick sell error:', error);
      toast.error(error.message || 'Failed to record sale');
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = quantity * Number(product.price);

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90 mb-4">
          Quick Sell
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {product.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {product.category} • Available: {product.stock}
            </div>
            <div className="text-lg font-semibold text-blue-700 dark:text-blue-300 mt-1">
              {new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
              }).format(Number(product.price))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quantity <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={loading || quantity <= 1}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                -
              </button>
              <input
                type="number"
                id="quantity"
                autoFocus
                required
                min={1}
                max={product.stock}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, Number(e.target.value))))}
                className="flex-1 px-3 py-2 text-center text-sm border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                disabled={loading || quantity >= product.stock}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>

          {/* Customer (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Customer (Optional)
            </label>
            <CustomerSearchSelect
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
            />
          </div>

          {/* Total */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white/90">
                {new Intl.NumberFormat("en-NG", {
                  style: "currency",
                  currency: "NGN",
                }).format(totalPrice)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
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
              {loading ? 'Recording...' : 'Record Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

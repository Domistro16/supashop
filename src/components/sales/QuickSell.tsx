import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Product } from '@/page-components/Products/Columns';
import { Customer, InstallmentInput } from '@/lib/api';
import CustomerSearchSelect from '@/components/customers/CustomerSearchSelect';
import { record_sale } from '@/supabaseClient';
import { toast } from 'react-hot-toast';
import { useDataRefresh } from '@/context/DataRefreshContext';

interface QuickSellProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentType = 'full' | 'installment';
type PaymentMethod = 'cash' | 'bank_transfer' | 'card';

export default function QuickSell({ product, onClose, onSuccess }: QuickSellProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const { refreshSales, refreshProducts } = useDataRefresh();

  // Payment tracking state
  const [paymentType, setPaymentType] = useState<PaymentType>('full');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // Multi-installment state
  const [installments, setInstallments] = useState<InstallmentInput[]>([]);
  const [newInstallmentAmount, setNewInstallmentAmount] = useState<number | ''>('');
  const [newInstallmentMethod, setNewInstallmentMethod] = useState<PaymentMethod>('cash');
  const [newInstallmentBank, setNewInstallmentBank] = useState('');
  const [newInstallmentAccount, setNewInstallmentAccount] = useState('');

  const totalPrice = quantity * Number(product.price);

  // Calculate total paid from installments
  const installmentTotal = useMemo(() => {
    return installments.reduce((sum, inst) => sum + Number(inst.amount), 0);
  }, [installments]);

  // Calculate outstanding balance
  const outstandingBalance = useMemo(() => {
    if (paymentType === 'full') return 0;
    return Math.max(0, totalPrice - installmentTotal);
  }, [paymentType, installmentTotal, totalPrice]);

  const addInstallment = () => {
    if (!newInstallmentAmount || newInstallmentAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (newInstallmentAmount > outstandingBalance) {
      toast.error(`Amount exceeds remaining balance (${outstandingBalance.toLocaleString()})`);
      return;
    }

    const newInst: InstallmentInput = {
      amount: newInstallmentAmount,
      paymentMethod: newInstallmentMethod,
      bankName: newInstallmentMethod === 'bank_transfer' ? newInstallmentBank : undefined,
      accountNumber: newInstallmentMethod === 'bank_transfer' ? newInstallmentAccount : undefined,
    };

    setInstallments([...installments, newInst]);
    setNewInstallmentAmount('');
    setNewInstallmentMethod('cash');
    setNewInstallmentBank('');
    setNewInstallmentAccount('');
  };

  const removeInstallment = (index: number) => {
    setInstallments(installments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (quantity < 1 || quantity > product.stock) {
      toast.error(`Quantity must be between 1 and ${product.stock}`);
      return;
    }

    // Validate payment for installments
    if (paymentType === 'installment' && installments.length === 0) {
      toast.error('Please add at least one installment payment');
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
        selectedCustomer?.id,
        paymentType === 'full'
          ? {
            paymentType: 'full',
            paymentMethod,
            bankName: paymentMethod === 'bank_transfer' ? bankName : undefined,
            accountNumber: paymentMethod === 'bank_transfer' ? accountNumber : undefined,
            amountPaid: totalPrice,
          }
          : {
            paymentType: 'installment',
            installments,
          }
      );

      if (success) {
        const statusMsg = outstandingBalance > 0 ? ' (Pending payment)' : '';
        toast.success(`Sold ${quantity} ${product.name}${selectedCustomer ? ` to ${selectedCustomer.name}` : ''}${statusMsg}`);

        await Promise.all([refreshSales(), refreshProducts()]);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(amount);
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90 mb-4">Quick Sell</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{product.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{product.category} • Available: {product.stock}</div>
            <div className="text-lg font-semibold text-blue-700 dark:text-blue-300 mt-1">{formatCurrency(Number(product.price))}</div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={loading || quantity <= 1}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50">-</button>
              <input type="number" autoFocus required min={1} max={product.stock} value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, Number(e.target.value))))}
                className="flex-1 px-3 py-2 text-center text-sm border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90" />
              <button type="button" onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} disabled={loading || quantity >= product.stock}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50">+</button>
            </div>
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer (Optional)</label>
            <CustomerSearchSelect selectedCustomer={selectedCustomer} onSelectCustomer={setSelectedCustomer} />
          </div>

          {/* Payment Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Type <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setPaymentType('full'); setInstallments([]); }}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${paymentType === 'full' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                Full Payment
              </button>
              <button type="button" onClick={() => setPaymentType('installment')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${paymentType === 'installment' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                Installment
              </button>
            </div>
          </div>

          {/* Full Payment Method */}
          {paymentType === 'full' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90">
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>
              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank Name"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90" />
                  <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account Number (Optional)"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90" />
                </div>
              )}
            </>
          )}

          {/* Installment Payments */}
          {paymentType === 'installment' && (
            <div className="space-y-3">
              {/* Installment List */}
              {installments.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 space-y-2">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Installments Added</div>
                  {installments.map((inst, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm bg-white dark:bg-gray-800 p-2 rounded">
                      <div>
                        <span className="font-medium">{formatCurrency(Number(inst.amount))}</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">({inst.paymentMethod.replace('_', ' ')})</span>
                        {inst.bankName && <span className="text-gray-500 dark:text-gray-400"> - {inst.bankName}</span>}
                      </div>
                      <button type="button" onClick={() => removeInstallment(idx)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Installment */}
              {outstandingBalance > 0 && (
                <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-md p-3 space-y-3">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Installment</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input type="number" value={newInstallmentAmount} onChange={(e) => setNewInstallmentAmount(e.target.value ? Number(e.target.value) : '')}
                      placeholder="Amount" max={outstandingBalance}
                      className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90" />
                    <select value={newInstallmentMethod} onChange={(e) => setNewInstallmentMethod(e.target.value as PaymentMethod)}
                      className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90">
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  {newInstallmentMethod === 'bank_transfer' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input type="text" value={newInstallmentBank} onChange={(e) => setNewInstallmentBank(e.target.value)} placeholder="Bank Name"
                        className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90" />
                      <input type="text" value={newInstallmentAccount} onChange={(e) => setNewInstallmentAccount(e.target.value)} placeholder="Account #"
                        className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90" />
                    </div>
                  )}
                  <button type="button" onClick={addInstallment}
                    className="w-full py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20">
                    + Add Installment
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Total & Balance Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md space-y-2">
            {/* Total Price & Profit */}
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-3">
              <div>
                <div className="text-base font-medium text-gray-900 dark:text-white/90">Total Price</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Profit: <span className="text-green-600 dark:text-green-400 font-medium">
                    {(() => {
                      const totalCost = Number(quantity || 0) * Number(product.costPrice || 0);
                      const profit = Math.max(0, totalPrice - totalCost);
                      const margin = totalPrice > 0 ? (profit / totalPrice) * 100 : 0;

                      return (
                        <>
                          {formatCurrency(profit)}
                          <span className="ml-1 text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                            {margin.toFixed(0)}%
                          </span>
                        </>
                      );
                    })()}
                  </span>
                </div>
              </div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalPrice)}</div>
            </div>
            {paymentType === 'installment' && (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Paid ({installments.length} installment{installments.length !== 1 ? 's' : ''})</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(installmentTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-gray-600 dark:text-gray-400">Remaining</span>
                  <span className={`font-medium ${outstandingBalance > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                    {formatCurrency(outstandingBalance)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Warning */}
          {paymentType === 'installment' && outstandingBalance > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-3">
              <p className="text-sm text-orange-700 dark:text-orange-300">⚠️ This sale will be marked as <strong>"Pending"</strong> until fully paid.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} disabled={loading}
              className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={loading || (paymentType === 'installment' && installments.length === 0)}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Recording...' : 'Record Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

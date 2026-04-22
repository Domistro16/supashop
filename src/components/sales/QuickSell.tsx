import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Product } from '@/page-components/Products/Columns';
import api, { Customer, InstallmentInput, LoyaltySettings } from '@/lib/api';
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
  const packSize = Math.max(1, Number((product as any).packSize) || 1);
  const packName = (product as any).packName as string | null | undefined;
  const hasPack = packSize > 1;

  const [unitMode, setUnitMode] = useState<'piece' | 'pack'>('piece');
  const [quantity, setQuantity] = useState(1);
  const [extraPieces, setExtraPieces] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const { refreshSales, refreshProducts } = useDataRefresh();

  const totalPieces = unitMode === 'pack' ? (quantity * packSize + extraPieces) : quantity;
  const maxPackQuantity = Math.max(1, Math.floor(product.stock / packSize));
  const maxExtraPieces = Math.max(0, product.stock - quantity * packSize);

  // Payment tracking state
  const [paymentType, setPaymentType] = useState<PaymentType>('full');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferProofFile, setTransferProofFile] = useState<File | null>(null);

  // Multi-installment state
  const [installments, setInstallments] = useState<InstallmentInput[]>([]);
  const [installmentProofFiles, setInstallmentProofFiles] = useState<(File | null)[]>([]);
  const [newInstallmentAmount, setNewInstallmentAmount] = useState<number | ''>('');
  const [newInstallmentMethod, setNewInstallmentMethod] = useState<PaymentMethod>('cash');
  const [newInstallmentNotes, setNewInstallmentNotes] = useState('');
  const [newInstallmentProofFile, setNewInstallmentProofFile] = useState<File | null>(null);

  // Loyalty redemption state
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  useEffect(() => {
    if (!selectedCustomer) {
      setPointsToRedeem(0);
      return;
    }
    if (loyaltySettings) return;
    api.loyalty
      .getOverview()
      .then((o) => setLoyaltySettings(o.settings))
      .catch(() => {});
  }, [selectedCustomer, loyaltySettings]);

  const subtotal = totalPieces * Number(product.price);
  const customerPoints = selectedCustomer?.loyaltyPoint?.points ?? 0;
  const nairaPerPoint = loyaltySettings?.nairaPerPoint ?? 0;
  const redemptionEnabled = !!(loyaltySettings?.enabled && selectedCustomer && customerPoints > 0 && nairaPerPoint > 0);
  const maxRedeemablePoints = redemptionEnabled
    ? Math.min(customerPoints, Math.floor(subtotal / Math.max(nairaPerPoint, 0.0001)))
    : 0;
  const redemptionDiscount = Math.min(
    subtotal,
    Math.max(0, pointsToRedeem) * nairaPerPoint
  );
  const totalPrice = Math.max(0, subtotal - redemptionDiscount);

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

    const trimmedNotes = newInstallmentMethod === 'bank_transfer' && newInstallmentNotes.trim().length > 0
      ? newInstallmentNotes.trim().slice(0, 500)
      : undefined;

    const newInst: InstallmentInput = {
      amount: newInstallmentAmount,
      paymentMethod: newInstallmentMethod,
      notes: trimmedNotes,
    };

    const newProof = newInstallmentMethod === 'bank_transfer' ? newInstallmentProofFile : null;

    setInstallments([...installments, newInst]);
    setInstallmentProofFiles([...installmentProofFiles, newProof]);
    setNewInstallmentAmount('');
    setNewInstallmentMethod('cash');
    setNewInstallmentNotes('');
    setNewInstallmentProofFile(null);
  };

  const removeInstallment = (index: number) => {
    setInstallments(installments.filter((_, i) => i !== index));
    setInstallmentProofFiles(installmentProofFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (totalPieces < 1 || totalPieces > product.stock) {
      toast.error(`Quantity must be between 1 and ${product.stock} pieces (have ${product.stock})`);
      return;
    }

    // Validate payment for installments
    if (paymentType === 'installment' && installments.length === 0) {
      toast.error('Please add at least one installment payment');
      return;
    }

    try {
      setLoading(true);
      const redemption = redemptionEnabled && pointsToRedeem > 0
        ? { pointsRedeemed: pointsToRedeem, redemptionDiscount }
        : {};
      const trimmedTransferNotes = paymentMethod === 'bank_transfer' && transferNotes.trim().length > 0
        ? transferNotes.trim().slice(0, 500)
        : undefined;
      const sale = await record_sale(
        [{
          product: product.id,
          quantity: totalPieces,
          unitCost: Number(product.price),
        }],
        selectedCustomer?.id,
        paymentType === 'full'
          ? {
            paymentType: 'full',
            paymentMethod,
            amountPaid: totalPrice,
            notes: trimmedTransferNotes,
            ...redemption,
          }
          : {
            paymentType: 'installment',
            installments,
            ...redemption,
          }
      );

      if (sale) {
        // Upload any pending proof files against the newly-created installments.
        try {
          const createdInstallments: Array<{ id: string }> = Array.isArray(sale?.installments) ? sale.installments : [];
          const uploads: Array<Promise<any>> = [];

          if (paymentType === 'full' && paymentMethod === 'bank_transfer' && transferProofFile && createdInstallments[0]?.id) {
            const fd = new FormData();
            fd.append('file', transferProofFile);
            fd.append('orderId', sale.id);
            fd.append('installmentId', createdInstallments[0].id);
            uploads.push(fetch('/api/upload', { method: 'POST', body: fd }));
          }

          if (paymentType === 'installment') {
            installmentProofFiles.forEach((file, idx) => {
              const target = createdInstallments[idx];
              if (file && target?.id) {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('orderId', sale.id);
                fd.append('installmentId', target.id);
                uploads.push(fetch('/api/upload', { method: 'POST', body: fd }));
              }
            });
          }

          if (uploads.length > 0) {
            const results = await Promise.allSettled(uploads);
            const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !(r.value as Response).ok));
            if (failed.length > 0) {
              toast.error(`Sale saved, but ${failed.length} proof upload${failed.length > 1 ? 's' : ''} failed`);
            }
          }
        } catch (uploadErr: any) {
          console.error('Proof upload error:', uploadErr);
          toast.error(`Sale saved, but proof upload failed: ${uploadErr.message || 'unknown error'}`);
        }

        const statusMsg = outstandingBalance > 0 ? ' (Pending payment)' : '';
        toast.success(`Sold ${totalPieces} ${product.name}${selectedCustomer ? ` to ${selectedCustomer.name}` : ''}${statusMsg}`);

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

          {/* Unit toggle for wholesale packs */}
          {hasPack && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sell as</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setUnitMode('piece'); setQuantity(1); }}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${unitMode === 'piece'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  Piece
                </button>
                <button
                  type="button"
                  onClick={() => { setUnitMode('pack'); setQuantity(1); }}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${unitMode === 'pack'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  {packName ? `${packName} of ${packSize}` : `Pack of ${packSize}`}
                </button>
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quantity <span className="text-red-500">*</span>
              {unitMode === 'pack' && <span className="ml-2 text-xs font-normal text-gray-500">({packName || 'pack'}s)</span>}
            </label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={loading || quantity <= 1}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50">-</button>
              <input type="number" autoFocus required min={1} max={maxQuantity} value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(maxQuantity, Number(e.target.value))))}
                className="flex-1 px-3 py-2 text-center text-sm border border-gray-200 dark:border-gray-800 rounded-md shadow-sm bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90" />
              <button type="button" onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))} disabled={loading || quantity >= maxQuantity}
                className="px-3 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50">+</button>
            </div>
            {unitMode === 'pack' && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {quantity} × {packSize} = <span className="font-semibold text-blue-600 dark:text-blue-400">{totalPieces} pieces</span>
              </div>
            )}
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer (Optional)</label>
            <CustomerSearchSelect selectedCustomer={selectedCustomer} onSelectCustomer={setSelectedCustomer} />
          </div>

          {/* Loyalty Redemption */}
          {redemptionEnabled && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Redeem loyalty points
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  {customerPoints.toLocaleString()} pts available
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={maxRedeemablePoints}
                  value={pointsToRedeem || ''}
                  onChange={(e) =>
                    setPointsToRedeem(Math.max(0, Math.min(maxRedeemablePoints, Number(e.target.value) || 0)))
                  }
                  placeholder="0"
                  className="flex-1 px-3 py-2 text-sm border border-amber-200 dark:border-amber-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90"
                />
                <button
                  type="button"
                  onClick={() => setPointsToRedeem(maxRedeemablePoints)}
                  className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline"
                >
                  Max ({maxRedeemablePoints})
                </button>
              </div>
              {pointsToRedeem > 0 && (
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  Discount: {formatCurrency(redemptionDiscount)}
                </div>
              )}
            </div>
          )}

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
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Notes <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value.slice(0, 500))}
                      rows={2}
                      placeholder="e.g. Sent from GTBank — John A."
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Proof of Payment <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md p-3 text-center relative hover:bg-white dark:hover:bg-gray-800/80 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setTransferProofFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={loading}
                      />
                      {transferProofFile ? (
                        <div className="text-blue-600 dark:text-blue-400 font-medium text-xs break-all">
                          {transferProofFile.name}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Attach receipt image (JPG/PNG, up to 5MB)
                        </div>
                      )}
                    </div>
                    {transferProofFile && (
                      <button
                        type="button"
                        onClick={() => setTransferProofFile(null)}
                        className="mt-1 text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
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
                    <div key={idx} className="flex justify-between items-start gap-2 text-sm bg-white dark:bg-gray-800 p-2 rounded">
                      <div className="min-w-0 flex-1">
                        <div>
                          <span className="font-medium">{formatCurrency(Number(inst.amount))}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-2">({inst.paymentMethod.replace('_', ' ')})</span>
                          {installmentProofFiles[idx] && (
                            <span className="text-[10px] ml-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                              proof
                            </span>
                          )}
                        </div>
                        {inst.notes && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate" title={inst.notes}>
                            {inst.notes}
                          </div>
                        )}
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
                    <div className="space-y-2 bg-white dark:bg-gray-800/50 p-2 rounded border border-gray-200 dark:border-gray-700">
                      <textarea
                        value={newInstallmentNotes}
                        onChange={(e) => setNewInstallmentNotes(e.target.value.slice(0, 500))}
                        rows={2}
                        placeholder="Notes (optional) — e.g. GTBank transfer"
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white/90"
                      />
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md p-2 text-center relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setNewInstallmentProofFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {newInstallmentProofFile ? (
                          <div className="text-blue-600 dark:text-blue-400 font-medium text-xs break-all">
                            {newInstallmentProofFile.name}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 dark:text-gray-400">Attach proof (optional)</div>
                        )}
                      </div>
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
            {redemptionDiscount > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-700 dark:text-gray-300">{formatCurrency(subtotal)}</span>
              </div>
            )}
            {redemptionDiscount > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-amber-700 dark:text-amber-300">
                  Points redeemed ({pointsToRedeem.toLocaleString()})
                </span>
                <span className="text-amber-700 dark:text-amber-300">
                  - {formatCurrency(redemptionDiscount)}
                </span>
              </div>
            )}
            {/* Total Price & Profit */}
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-3">
              <div>
                <div className="text-base font-medium text-gray-900 dark:text-white/90">Total Price</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mt-1">
                  <div>
                    Expected Profit: <span className="text-purple-600 dark:text-purple-400 font-medium">
                      {(() => {
                        const totalCost = Number(totalPieces || 0) * Number(product.costPrice || 0);
                        const profit = Math.max(0, totalPrice - totalCost);
                        const margin = totalPrice > 0 ? (profit / totalPrice) * 100 : 0;

                        return (
                          <>
                            {formatCurrency(profit)}
                            <span className="ml-1 text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded-full">
                              {margin.toFixed(0)}%
                            </span>
                          </>
                        );
                      })()}
                    </span>
                  </div>
                  <div>
                    Realized Profit: <span className="text-green-600 dark:text-green-400 font-medium">
                      {(() => {
                        const totalCost = Number(totalPieces || 0) * Number(product.costPrice || 0);
                        const expectedProfit = Math.max(0, totalPrice - totalCost);
                        const paid = paymentType === 'full' ? totalPrice : installmentTotal;
                        const realized = totalPrice > 0 ? (paid / totalPrice) * expectedProfit : 0;

                        return formatCurrency(realized);
                      })()}
                    </span>
                  </div>
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

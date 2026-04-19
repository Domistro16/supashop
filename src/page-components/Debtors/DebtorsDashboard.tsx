'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock, Loader2, Phone, Wallet, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Link } from '@/lib/react-router-compat'
import { Button } from '@/components/ui/button'
import Spinner from '@/components/ui/Spinner'
import { getSales } from '@/supabaseClient'
import api from '@/lib/api'

type Debtor = {
  id: string
  order_id: string
  total_amount: string
  amount_paid?: string
  outstanding_balance?: string
  created_at: string
  customer?: { id: string; name: string; phone?: string } | null
  payment_method?: string
  bank_name?: string
}

type CustomerGroup = {
  customerId: string
  name: string
  phone?: string
  totalOutstanding: number
  sales: Debtor[]
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n)
}

function daysSince(dateStr: string) {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  return days
}

function ageBadge(days: number) {
  if (days >= 30) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  if (days >= 14) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
  if (days >= 7) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
}

export default function DebtorsDashboard() {
  const [loading, setLoading] = useState(true)
  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [search, setSearch] = useState('')
  const [activeSale, setActiveSale] = useState<Debtor | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card'>('cash')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      const sales = await getSales()
      const pending = sales.filter(
        (s) => s.payment_status === 'pending' && Number(s.outstanding_balance || 0) > 0,
      )
      setDebtors(pending as Debtor[])
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load debtors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const { groups, totalOutstanding, totalSales } = useMemo(() => {
    const map = new Map<string, CustomerGroup>()
    let total = 0
    for (const d of debtors) {
      const bal = Number(d.outstanding_balance || 0)
      total += bal
      const key = d.customer?.id || '__walkin__'
      const name = d.customer?.name || 'Walk-in customer'
      const phone = d.customer?.phone
      const existing = map.get(key)
      if (existing) {
        existing.totalOutstanding += bal
        existing.sales.push(d)
      } else {
        map.set(key, {
          customerId: key,
          name,
          phone,
          totalOutstanding: bal,
          sales: [d],
        })
      }
    }
    const arr = Array.from(map.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding)
    arr.forEach((g) =>
      g.sales.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    )
    return { groups: arr, totalOutstanding: total, totalSales: debtors.length }
  }, [debtors])

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups
    const q = search.toLowerCase()
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.phone?.toLowerCase().includes(q) ||
        g.sales.some((s) => s.order_id.toLowerCase().includes(q)),
    )
  }, [groups, search])

  const openPayment = (sale: Debtor) => {
    setActiveSale(sale)
    setPaymentAmount(Number(sale.outstanding_balance || 0))
    setPaymentMethod('cash')
    setBankName('')
    setAccountNumber('')
  }

  const closePayment = () => {
    setActiveSale(null)
    setPaymentAmount('')
  }

  const submitPayment = async () => {
    if (!activeSale) return
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    try {
      setSubmitting(true)
      await api.sales.updatePayment(activeSale.id, {
        amountPaid: Number(paymentAmount),
        paymentMethod,
        bankName: paymentMethod === 'bank_transfer' ? bankName : undefined,
        accountNumber: paymentMethod === 'bank_transfer' ? accountNumber : undefined,
      })
      toast.success('Payment recorded')
      closePayment()
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Debtors</h1>
        <p className="text-sm text-gray-500 mt-1">
          Outstanding balances from pending or installment payments.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="Total outstanding"
          value={formatCurrency(totalOutstanding)}
          tone="warning"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Pending sales"
          value={totalSales.toLocaleString()}
        />
        <StatCard
          icon={<Phone className="w-5 h-5" />}
          label="Debtors"
          value={groups.length.toLocaleString()}
        />
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-lg p-3">
        <input
          type="text"
          placeholder="Search by customer name, phone, or order ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Groups */}
      {filteredGroups.length === 0 ? (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-lg p-10 text-center">
          <Wallet className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {search ? 'No debtors match your search.' : 'No outstanding balances. Great work!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <div
              key={group.customerId}
              className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {group.customerId !== '__walkin__' ? (
                      <Link
                        href={`/customers/${group.customerId}`}
                        className="font-semibold text-gray-900 dark:text-white hover:underline"
                      >
                        {group.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {group.name}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {group.sales.length} sale{group.sales.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {group.phone && (
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      <a href={`tel:${group.phone}`} className="hover:underline">
                        {group.phone}
                      </a>
                      <a
                        href={`https://wa.me/${group.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                          `Hi ${group.name}, this is a friendly reminder about your outstanding balance of ${formatCurrency(group.totalOutstanding)}. Please let us know when we can expect payment. Thank you.`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 dark:text-green-400 hover:underline"
                      >
                        WhatsApp reminder
                      </a>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 uppercase">Owed</div>
                  <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {formatCurrency(group.totalOutstanding)}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {group.sales.map((s) => {
                  const days = daysSince(s.created_at)
                  return (
                    <div
                      key={s.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/sales/${s.order_id}`}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            #{s.order_id}
                          </Link>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ageBadge(days)}`}>
                            {days === 0 ? 'Today' : `${days}d old`}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>
                            Total {formatCurrency(Number(s.total_amount))}
                          </span>
                          <span>
                            Paid {formatCurrency(Number(s.amount_paid || 0))}
                          </span>
                          <span>
                            {new Date(s.created_at).toLocaleDateString('en-NG', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="text-right">
                          <div className="text-[10px] uppercase text-gray-500">Balance</div>
                          <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                            {formatCurrency(Number(s.outstanding_balance || 0))}
                          </div>
                        </div>
                        <Button
                          variant="default"
                          className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs"
                          onClick={() => openPayment(s)}
                        >
                          Record payment
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {activeSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold">Record payment</h2>
              <button
                onClick={closePayment}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                disabled={submitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-3 text-sm">
                <div className="text-gray-600 dark:text-gray-300">
                  Order #{activeSale.order_id} ·{' '}
                  {activeSale.customer?.name || 'Walk-in'}
                </div>
                <div className="text-orange-700 dark:text-orange-300 mt-1">
                  Outstanding:{' '}
                  <strong>{formatCurrency(Number(activeSale.outstanding_balance || 0))}</strong>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                  max={Number(activeSale.outstanding_balance || 0)}
                  min={0}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>

              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bank name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. GTBank"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Account number (optional)
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-800">
              <Button variant="outline" onClick={closePayment} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={submitPayment}
                disabled={submitting || !paymentAmount || Number(paymentAmount) <= 0}
              >
                {submitting ? 'Recording...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: 'warning'
}) {
  const toneClasses =
    tone === 'warning'
      ? 'text-orange-600 dark:text-orange-400'
      : 'text-gray-900 dark:text-white'
  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-lg p-5">
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-2 text-2xl font-bold ${toneClasses}`}>{value}</div>
    </div>
  )
}

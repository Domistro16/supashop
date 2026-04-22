'use client';

import { useEffect, useMemo, useState } from 'react';
import api, { Expense } from '@/lib/api';
import { useUser } from '@/context/UserContext';
import toast from 'react-hot-toast';
import {
    Plus,
    Trash2,
    Receipt,
    Loader2,
    RefreshCw,
    X,
} from 'lucide-react';

const COMMON_CATEGORIES = [
    'Transport',
    'Utilities',
    'Rent',
    'Salaries',
    'Supplies',
    'Repairs',
    'Marketing',
    'Bank Charges',
    'Other',
];

const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n);

const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-NG', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

export default function ExpensesDashboard() {
    const { currentShop } = useUser();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.expenses.getAll({
                from: fromDate || undefined,
                to: toDate || undefined,
                category: categoryFilter || undefined,
            });
            setExpenses(res.expenses);
            setTotal(res.total);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load expenses');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [currentShop?.id]);

    const byCategory = useMemo(() => {
        const map = new Map<string, number>();
        for (const e of expenses) {
            map.set(e.category, (map.get(e.category) || 0) + Number(e.amount));
        }
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    }, [expenses]);

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this expense? This cannot be undone.')) return;
        try {
            await api.expenses.delete(id);
            toast.success('Expense deleted');
            load();
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete');
        }
    };

    return (
        <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-blue-600" />
                        Expenses
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Track every cash and bank outflow so your profit figures tell the truth.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={load}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowAdd(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                    >
                        <Plus className="w-4 h-4" />
                        Add Expense
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <SummaryCard label="Total (filtered)" value={formatCurrency(total)} highlight />
                <SummaryCard label="Entries" value={expenses.length.toString()} />
                <SummaryCard
                    label="Top category"
                    value={byCategory[0] ? `${byCategory[0][0]} — ${formatCurrency(byCategory[0][1])}` : '—'}
                />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90"
                >
                    <option value="">All categories</option>
                    {COMMON_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
                <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    placeholder="From"
                    className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90"
                />
                <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    placeholder="To"
                    className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90"
                />
                <button
                    type="button"
                    onClick={load}
                    className="px-3 py-2 text-sm font-medium text-white bg-gray-800 dark:bg-white/10 rounded-md hover:bg-gray-700 dark:hover:bg-white/20"
                >
                    Apply
                </button>
            </div>

            {/* Category chips */}
            {byCategory.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {byCategory.map(([cat, sum]) => (
                        <span
                            key={cat}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full"
                        >
                            {cat} · {formatCurrency(sum)}
                        </span>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="text-center py-12 px-4">
                        <Receipt className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            No expenses yet. Add one to start tracking.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Date</th>
                                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Category</th>
                                    <th className="text-right p-3 font-medium text-gray-600 dark:text-gray-400">Amount</th>
                                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Paid by</th>
                                    <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Note</th>
                                    <th className="w-12" />
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map((e) => (
                                    <tr
                                        key={e.id}
                                        className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                    >
                                        <td className="p-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                            {formatDate(e.expenseDate)}
                                        </td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">
                                            <span className="inline-flex items-center px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
                                                {e.category}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                                            - {formatCurrency(Number(e.amount))}
                                        </td>
                                        <td className="p-3 text-gray-500 dark:text-gray-400">
                                            {e.paidByUser?.name || '—'}
                                        </td>
                                        <td className="p-3 text-gray-500 dark:text-gray-400 max-w-[240px]">
                                            {e.note ? (
                                                <span className="line-clamp-2" title={e.note}>
                                                    {e.note}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="p-3">
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(e.id)}
                                                className="text-red-500 hover:text-red-700"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showAdd && (
                <AddExpenseModal
                    onClose={() => setShowAdd(false)}
                    onSuccess={() => {
                        setShowAdd(false);
                        load();
                    }}
                />
            )}
        </div>
    );
}

function SummaryCard({
    label,
    value,
    highlight,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div
            className={`p-4 rounded-lg border ${highlight
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                }`}
        >
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {label}
            </div>
            <div
                className={`text-xl font-semibold mt-1 ${highlight ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'
                    }`}
            >
                {value}
            </div>
        </div>
    );
}

function AddExpenseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [category, setCategory] = useState('Transport');
    const [customCategory, setCustomCategory] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [note, setNote] = useState('');
    const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalCategory = category === 'Other' ? customCategory.trim() : category;
        if (!finalCategory) {
            toast.error('Enter a category');
            return;
        }
        if (!amount || amount <= 0) {
            toast.error('Enter a valid amount');
            return;
        }
        try {
            setSubmitting(true);
            await api.expenses.create({
                category: finalCategory,
                amount: Number(amount),
                note: note.trim() || undefined,
                expenseDate: new Date(expenseDate).toISOString(),
            });
            toast.success('Expense recorded');
            onSuccess();
        } catch (err: any) {
            toast.error(err.message || 'Failed to save');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Expense</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90"
                        >
                            {COMMON_CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        {category === 'Other' && (
                            <input
                                type="text"
                                value={customCategory}
                                onChange={(e) => setCustomCategory(e.target.value.slice(0, 80))}
                                placeholder="Custom category name"
                                className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90"
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Amount <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={amount}
                            min={0}
                            step="0.01"
                            onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Date
                        </label>
                        <input
                            type="date"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Note <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            value={note}
                            rows={2}
                            onChange={(e) => setNote(e.target.value.slice(0, 500))}
                            placeholder="e.g. Delivery fuel for Lagos run"
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90"
                        />
                        <div className="mt-1 text-[11px] text-gray-400 text-right">{note.length}/500</div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                        >
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {submitting ? 'Saving...' : 'Save Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

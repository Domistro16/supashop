'use client';

import { useEffect, useState } from 'react';
import api, {
    Branch,
    ConsolidatedReportRow,
    StockTransfer,
    Product,
} from '@/lib/api';
import { useUser } from '@/context/UserContext';
import toast from 'react-hot-toast';
import {
    Building2,
    Plus,
    ArrowLeftRight,
    RefreshCw,
    Loader2,
    X,
    CheckCircle2,
    XCircle,
} from 'lucide-react';

const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n);

export default function BranchesDashboard() {
    const { currentShop } = useUser();
    const [rootShopId, setRootShopId] = useState<string | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [consolidated, setConsolidated] = useState<{
        perShop: ConsolidatedReportRow[];
        totals: { revenue30d: number; sales30d: number; outstandingBalance: number };
    } | null>(null);
    const [transfers, setTransfers] = useState<StockTransfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateBranch, setShowCreateBranch] = useState(false);
    const [showTransfer, setShowTransfer] = useState(false);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [list, cons, trans] = await Promise.all([
                api.branches.list(),
                api.branches.consolidated(),
                api.stockTransfers.list(),
            ]);
            setRootShopId(list.rootShopId);
            setBranches(list.branches);
            setConsolidated({ perShop: cons.perShop, totals: cons.totals });
            setTransfers(trans);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load branches');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, [currentShop?.id]);

    const completeTransfer = async (id: string) => {
        try {
            await api.stockTransfers.complete(id);
            toast.success('Transfer completed — stock moved');
            loadAll();
        } catch (err: any) {
            toast.error(err.message || 'Failed to complete transfer');
        }
    };

    const cancelTransfer = async (id: string) => {
        if (!confirm('Cancel this pending transfer?')) return;
        try {
            await api.stockTransfers.cancel(id);
            toast.success('Transfer cancelled');
            loadAll();
        } catch (err: any) {
            toast.error(err.message || 'Failed to cancel');
        }
    };

    const syncPrices = async (branchId: string) => {
        try {
            const { updated } = await api.branches.syncPrices(branchId);
            toast.success(`Synced ${updated} product${updated === 1 ? '' : 's'} from HQ`);
            loadAll();
        } catch (err: any) {
            toast.error(err.message || 'Sync failed');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
            </div>
        );
    }

    const isHQ = rootShopId === currentShop?.id;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Branches</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isHQ
                            ? 'Manage your locations and move stock between them.'
                            : 'Viewing branch data. Switch to HQ to add branches.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowTransfer(true)}
                        className="inline-flex items-center px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-white/[0.03] text-gray-800 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/[0.08]"
                    >
                        <ArrowLeftRight className="w-4 h-4 mr-2" />
                        New Transfer
                    </button>
                    {isHQ && (
                        <button
                            onClick={() => setShowCreateBranch(true)}
                            className="inline-flex items-center px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Branch
                        </button>
                    )}
                </div>
            </div>

            {/* Consolidated totals */}
            {consolidated && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SummaryCard label="Revenue (30d)" value={formatCurrency(consolidated.totals.revenue30d)} />
                    <SummaryCard label="Sales (30d)" value={consolidated.totals.sales30d.toString()} />
                    <SummaryCard label="Outstanding debt" value={formatCurrency(consolidated.totals.outstandingBalance)} />
                </div>
            )}

            {/* Per-shop breakdown */}
            {consolidated && (
                <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">All locations</h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {consolidated.perShop.map((s) => (
                            <div key={s.shopId} className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 dark:text-white">{s.name}</span>
                                        {s.isHQ && (
                                            <span className="text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                HQ
                                            </span>
                                        )}
                                        {s.branchLabel && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">· {s.branchLabel}</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {s.productCount} products · {s.sales30d} sales (30d)
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(s.revenue30d)}</div>
                                    {s.outstandingBalance > 0 && (
                                        <div className="text-xs text-orange-600 dark:text-orange-400">
                                            {formatCurrency(s.outstandingBalance)} owed
                                        </div>
                                    )}
                                </div>
                                {!s.isHQ && isHQ && (
                                    <button
                                        onClick={() => syncPrices(s.shopId)}
                                        className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Sync prices
                                    </button>
                                )}
                            </div>
                        ))}
                        {consolidated.perShop.length <= 1 && (
                            <div className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                You only have one location. Click "New Branch" to add another.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Transfers list */}
            <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Recent stock transfers</h2>
                </div>
                {transfers.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No transfers yet.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {transfers.map((t) => (
                            <div key={t.id} className="px-5 py-3 flex items-center justify-between flex-wrap gap-3">
                                <div>
                                    <div className="text-sm text-gray-900 dark:text-white">
                                        <span className="font-medium">{t.fromShop.name}</span>
                                        <span className="mx-2 text-gray-400">→</span>
                                        <span className="font-medium">{t.toShop.name}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {t.items.length} item{t.items.length === 1 ? '' : 's'} ·{' '}
                                        {new Date(t.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                                        {t.notes && ` · ${t.notes}`}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={t.status} />
                                    {t.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => completeTransfer(t.id)}
                                                className="text-xs px-2 py-1 rounded-md bg-green-600 text-white hover:bg-green-700"
                                            >
                                                Complete
                                            </button>
                                            <button
                                                onClick={() => cancelTransfer(t.id)}
                                                className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showCreateBranch && (
                <CreateBranchModal
                    onClose={() => setShowCreateBranch(false)}
                    onCreated={() => {
                        setShowCreateBranch(false);
                        loadAll();
                    }}
                />
            )}

            {showTransfer && (
                <CreateTransferModal
                    currentShopId={currentShop?.id || ''}
                    branches={branches}
                    rootShopId={rootShopId}
                    onClose={() => setShowTransfer(false)}
                    onCreated={() => {
                        setShowTransfer(false);
                        loadAll();
                    }}
                />
            )}
        </div>
    );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-white dark:bg-white/[0.03] rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value}</div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    };
    const Icon = status === 'completed' ? CheckCircle2 : status === 'cancelled' ? XCircle : null;
    return (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${map[status] || ''}`}>
            {Icon && <Icon className="w-3 h-3" />}
            {status}
        </span>
    );
}

function CreateBranchModal({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: () => void;
}) {
    const [name, setName] = useState('');
    const [branchLabel, setBranchLabel] = useState('');
    const [address, setAddress] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (name.trim().length < 2) {
            toast.error('Branch name is required');
            return;
        }
        setSaving(true);
        try {
            const { clonedProducts } = await api.branches.create({
                name: name.trim(),
                branchLabel: branchLabel.trim() || undefined,
                address: address.trim() || undefined,
            });
            toast.success(
                clonedProducts > 0
                    ? `Branch created. ${clonedProducts} products cloned at zero stock.`
                    : 'Branch created.'
            );
            onCreated();
        } catch (err: any) {
            toast.error(err.message || 'Failed to create branch');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="Create branch" onClose={onClose}>
            <div className="space-y-3">
                <Field label="Branch name">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Lekki Branch"
                        className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white"
                    />
                </Field>
                <Field label="Label (optional)">
                    <input
                        value={branchLabel}
                        onChange={(e) => setBranchLabel(e.target.value)}
                        placeholder="e.g. Main outlet, Warehouse"
                        className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white"
                    />
                </Field>
                <Field label="Address (optional)">
                    <input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white"
                    />
                </Field>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    HQ's products will be cloned into this branch at zero stock. Use "Transfer" to move stock in.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={saving}
                        className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                        {saving ? 'Creating…' : 'Create branch'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function CreateTransferModal({
    currentShopId,
    branches,
    rootShopId,
    onClose,
    onCreated,
}: {
    currentShopId: string;
    branches: Branch[];
    rootShopId: string | null;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [toShopId, setToShopId] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [selected, setSelected] = useState<Record<string, number>>({});
    const [saving, setSaving] = useState(false);

    // Destination candidates = all shops in org except current
    const destCandidates = [
        ...(rootShopId && rootShopId !== currentShopId
            ? [{ id: rootShopId, name: 'HQ', branchLabel: null as string | null }]
            : []),
        ...branches
            .filter((b) => b.id !== currentShopId)
            .map((b) => ({ id: b.id, name: b.name, branchLabel: b.branchLabel || null })),
    ];

    useEffect(() => {
        setLoadingProducts(true);
        api.products
            .getAll()
            .then((res) => setProducts(res.products || []))
            .catch(() => toast.error('Failed to load products'))
            .finally(() => setLoadingProducts(false));
    }, []);

    const inStockProducts = products.filter((p) => (p.stock || 0) > 0);

    const submit = async () => {
        if (!toShopId) {
            toast.error('Pick a destination shop');
            return;
        }
        const items = Object.entries(selected)
            .filter(([, qty]) => qty > 0)
            .map(([fromProductId, quantity]) => ({ fromProductId, quantity }));
        if (items.length === 0) {
            toast.error('Add at least one product to transfer');
            return;
        }
        setSaving(true);
        try {
            await api.stockTransfers.create({ toShopId, items, notes: notes.trim() || undefined });
            toast.success('Transfer created — mark complete when stock physically moves');
            onCreated();
        } catch (err: any) {
            toast.error(err.message || 'Failed to create transfer');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title="New stock transfer" onClose={onClose}>
            <div className="space-y-3">
                <Field label="Destination shop">
                    <select
                        value={toShopId}
                        onChange={(e) => setToShopId(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white"
                    >
                        <option value="">Select a shop…</option>
                        {destCandidates.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                                {s.branchLabel ? ` — ${s.branchLabel}` : ''}
                            </option>
                        ))}
                    </select>
                </Field>

                <Field label="Products to send">
                    {loadingProducts ? (
                        <div className="text-sm text-gray-500">Loading…</div>
                    ) : inStockProducts.length === 0 ? (
                        <div className="text-sm text-gray-500 italic">No products with stock at this shop.</div>
                    ) : (
                        <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-100 dark:divide-gray-800">
                            {inStockProducts.map((p) => {
                                const qty = selected[p.id] || 0;
                                return (
                                    <div key={p.id} className="px-3 py-2 flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm truncate text-gray-900 dark:text-white">{p.name}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {p.stock} in stock
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            min={0}
                                            max={p.stock || 0}
                                            value={qty || ''}
                                            onChange={(e) =>
                                                setSelected((prev) => {
                                                    const v = Math.max(0, Math.min(Number(e.target.value) || 0, p.stock || 0));
                                                    const next = { ...prev };
                                                    if (v === 0) delete next[p.id];
                                                    else next[p.id] = v;
                                                    return next;
                                                })
                                            }
                                            placeholder="qty"
                                            className="w-20 px-2 py-1 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Field>

                <Field label="Notes (optional)">
                    <input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. End of day transfer"
                        className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03] text-gray-900 dark:text-white"
                    />
                </Field>

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={saving}
                        className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                        {saving ? 'Creating…' : 'Create transfer'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function Modal({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</span>
            {children}
        </label>
    );
}

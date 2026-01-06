/**
 * Unified AI Dashboard Component
 * Combines all AI features into a single comprehensive view:
 * - Business Summary, Predictions, Restocking (existing - now unified)
 * - Risk Report (new)
 * - Marketing Assistant (new)
 * - Daily Briefing (new)
 */

import React, { useState, useEffect, useCallback } from "react";
import { api, AIUnifiedInsights, AIRiskReport, AIMarketingMessage, AIDailyBriefing } from "@/lib/api";
import { toast } from "sonner";

// Tab type
type AITab = 'briefing' | 'insights' | 'risk' | 'marketing';

export default function AIInsightsDashboard() {
    const [activeTab, setActiveTab] = useState<AITab>('briefing');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Data states
    const [briefing, setBriefing] = useState<AIDailyBriefing | null>(null);
    const [insights, setInsights] = useState<AIUnifiedInsights | null>(null);
    const [riskReport, setRiskReport] = useState<AIRiskReport | null>(null);
    const [marketing, setMarketing] = useState<AIMarketingMessage | null>(null);

    // Load all data
    const loadData = useCallback(async (showRefreshToast = false) => {
        try {
            if (showRefreshToast) setRefreshing(true);
            else setLoading(true);

            // Load based on active tab (lazy loading)
            if (activeTab === 'briefing' && !briefing) {
                const data = await api.ai.getDailyBriefing();
                setBriefing(data);
            } else if (activeTab === 'insights' && !insights) {
                const data = await api.ai.getUnifiedInsights();
                setInsights(data);
            } else if (activeTab === 'risk' && !riskReport) {
                const data = await api.ai.getRiskReport();
                setRiskReport(data);
            } else if (activeTab === 'marketing' && !marketing) {
                const data = await api.ai.getMarketingMessage();
                setMarketing(data);
            }

            if (showRefreshToast) toast.success("AI insights refreshed");
        } catch (error) {
            console.error("Failed to load AI data:", error);
            toast.error("Failed to load AI insights");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab, briefing, insights, riskReport, marketing]);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const handleRefresh = async () => {
        // Clear current tab data and reload
        if (activeTab === 'briefing') setBriefing(null);
        else if (activeTab === 'insights') setInsights(null);
        else if (activeTab === 'risk') setRiskReport(null);
        else if (activeTab === 'marketing') setMarketing(null);

        await loadData(true);
    };

    const tabs: { id: AITab; label: string; icon: React.ReactNode }[] = [
        {
            id: 'briefing',
            label: 'Daily Briefing',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
        {
            id: 'insights',
            label: 'Insights',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            ),
        },
        {
            id: 'risk',
            label: 'Risk Report',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
        },
        {
            id: 'marketing',
            label: 'Marketing',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-800 dark:text-white">
                                AI Command Center
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Powered by Gemini AI
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-800 px-4">
                <nav className="flex gap-4 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 py-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="p-4">
                {loading ? (
                    <LoadingSkeleton />
                ) : (
                    <>
                        {activeTab === 'briefing' && briefing && <DailyBriefingView data={briefing} />}
                        {activeTab === 'insights' && insights && <UnifiedInsightsView data={insights} />}
                        {activeTab === 'risk' && riskReport && <RiskReportView data={riskReport} />}
                        {activeTab === 'marketing' && marketing && <MarketingView data={marketing} />}
                    </>
                )}
            </div>
        </div>
    );
}

// Loading skeleton
function LoadingSkeleton() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6"></div>
            <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
                <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </div>
        </div>
    );
}

// Daily Briefing View
function DailyBriefingView({ data }: { data: AIDailyBriefing }) {
    // Defensive defaults for optional properties
    const comparison = data.comparison || { trend: 'stable', vsYesterday: '0%' };
    const metrics = data.metrics || { totalSales: 0, totalRevenue: 0, avgOrderValue: 0, topProduct: null, lowStockCount: 0 };
    const riskAlerts = data.riskAlerts || [];
    const recommendedActions = data.recommendedActions || [];
    const whatsappPromo = data.whatsappPromo || '';

    const trendIcon = comparison.trend === 'up' ? '📈' : comparison.trend === 'down' ? '📉' : '➡️';
    const trendColor = comparison.trend === 'up' ? 'text-green-600' : comparison.trend === 'down' ? 'text-red-600' : 'text-gray-600';

    return (
        <div className="space-y-4">
            {/* Headline */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{data.headline || 'Daily Briefing'}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{data.briefingText || 'No data available'}</p>
                </div>
                <div className={`flex items-center gap-1 ${trendColor}`}>
                    <span className="text-xl">{trendIcon}</span>
                    <span className="text-sm font-medium">{comparison.vsYesterday}</span>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard label="Total Sales" value={metrics.totalSales?.toString() || '0'} />
                <MetricCard label="Revenue" value={`₦${(metrics.totalRevenue || 0).toLocaleString()}`} />
                <MetricCard label="Avg Order" value={`₦${(metrics.avgOrderValue || 0).toFixed(0)}`} />
                <MetricCard label="Low Stock" value={(metrics.lowStockCount || 0).toString()} alert={(metrics.lowStockCount || 0) > 0} />
            </div>

            {/* Risk Alerts */}
            {riskAlerts.length > 0 && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2">⚠️ Risk Alerts</h4>
                    <ul className="space-y-1">
                        {riskAlerts.map((alert, i) => (
                            <li key={i} className="text-xs text-orange-600 dark:text-orange-400">• {alert}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Recommended Actions */}
            {recommendedActions.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recommended Actions</h4>
                    <div className="grid gap-2">
                        {recommendedActions.map((action, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <span className="text-blue-500">✓</span>
                                <span className="text-xs text-gray-700 dark:text-gray-300">{action}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* WhatsApp Promo */}
            {whatsappPromo && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-green-700 dark:text-green-300">📱 WhatsApp Promo</h4>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(whatsappPromo);
                                toast.success("Copied to clipboard!");
                            }}
                            className="text-xs text-green-600 hover:text-green-700 dark:text-green-400"
                        >
                            Copy
                        </button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{whatsappPromo}</p>
                </div>
            )}
        </div>
    );
}

// Metric Card Component
function MetricCard({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
    return (
        <div className={`p-3 rounded-lg ${alert ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`text-lg font-bold ${alert ? 'text-orange-600' : 'text-gray-800 dark:text-white'}`}>{value}</p>
        </div>
    );
}

// Unified Insights View (combines existing 3 components)
function UnifiedInsightsView({ data }: { data: AIUnifiedInsights }) {
    return (
        <div className="grid gap-6">
            {/* Predictions */}
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">📊 Sales Predictions</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{data.predictions.predictions}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400"><strong>Trends:</strong> {data.predictions.trends}</p>
                <div className="mt-3">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Recommendations:</p>
                    <ul className="space-y-1">
                        {data.predictions.recommendations.map((rec, i) => (
                            <li key={i} className="text-xs text-gray-600 dark:text-gray-400">• {rec}</li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Business Summary */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">📋 Business Summary</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{data.summary.summary}</p>
                {data.summary.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {data.summary.highlights.map((h, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                                ⭐ {h}
                            </span>
                        ))}
                    </div>
                )}
                <p className="text-xs text-gray-600 dark:text-gray-400">{data.summary.insights}</p>
            </div>

            {/* Restocking */}
            <div className={`p-4 rounded-lg border ${data.restocking.urgentRestocks.length > 0 ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
                <h4 className={`text-sm font-semibold mb-2 ${data.restocking.urgentRestocks.length > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-green-700 dark:text-green-300'}`}>
                    📦 Inventory Insights
                </h4>
                {data.restocking.urgentRestocks.length > 0 ? (
                    <div className="space-y-2 mb-3">
                        {data.restocking.urgentRestocks.map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded">
                                <span className="text-sm text-gray-700 dark:text-gray-300">{item.productName}</span>
                                <span className="text-xs text-orange-600 dark:text-orange-400">Stock: {item.currentStock}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-green-600 dark:text-green-400 mb-2">✓ All stock levels look healthy</p>
                )}
                <p className="text-xs text-gray-600 dark:text-gray-400">{data.restocking.insights}</p>
            </div>
        </div>
    );
}

// Risk Report View
function RiskReportView({ data }: { data: AIRiskReport }) {
    const riskColor = {
        low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
        <div className="space-y-4">
            {/* Overall Risk */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white">Risk Assessment</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Analyzed: {data.analyzedPeriod}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold uppercase ${riskColor[data.overallRiskLevel]}`}>
                    {data.overallRiskLevel} Risk
                </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">{data.summary}</p>

            {/* Staff Risks */}
            {data.staffRisks.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h4 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">👤 Staff Alerts</h4>
                    <div className="space-y-2">
                        {data.staffRisks.map((staff, i) => (
                            <div key={i} className="p-2 bg-white dark:bg-gray-800 rounded">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{staff.staffName}</span>
                                    <span className="text-xs text-red-600">Score: {staff.riskScore}</span>
                                </div>
                                <ul className="mt-1">
                                    {staff.reasons.map((r, j) => (
                                        <li key={j} className="text-xs text-gray-500">• {r}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Suspicious Transactions */}
            {data.suspiciousTransactions.length > 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <h4 className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 mb-2">🔍 Suspicious Transactions</h4>
                    <div className="space-y-2">
                        {data.suspiciousTransactions.slice(0, 5).map((tx, i) => (
                            <div key={i} className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded text-xs">
                                <span className="text-gray-700 dark:text-gray-300">{tx.reason}</span>
                                <span className="text-yellow-600">₦{tx.amount.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Inventory Warnings */}
            {data.inventoryWarnings.length > 0 && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2">📦 Inventory Warnings</h4>
                    <ul className="space-y-1">
                        {data.inventoryWarnings.map((w, i) => (
                            <li key={i} className="text-xs text-gray-600 dark:text-gray-400">
                                • <strong>{w.productName}:</strong> {w.details}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {data.staffRisks.length === 0 && data.suspiciousTransactions.length === 0 && data.inventoryWarnings.length === 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                    <span className="text-2xl">✅</span>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-2">No significant risks detected</p>
                </div>
            )}
        </div>
    );
}

// Marketing View
function MarketingView({ data }: { data: AIMarketingMessage }) {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    };

    return (
        <div className="space-y-4">
            {/* WhatsApp Promo */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-green-700 dark:text-green-300">📱 WhatsApp Promo Message</h4>
                    <button
                        onClick={() => copyToClipboard(data.whatsappPromo)}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        Copy
                    </button>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 p-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-800">
                    {data.whatsappPromo}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">{data.whatsappPromo.length}/200 characters</p>
            </div>

            {/* Recommended Discount */}
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">💰 Recommended Discount</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{data.recommendedDiscount}</p>
            </div>

            {/* Suggested Bundle */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">📦 Suggested Bundle</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{data.suggestedBundle}</p>
            </div>

            {/* Marketing Actions */}
            <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">🎯 Marketing Actions</h4>
                <div className="space-y-2">
                    {data.marketingActions.map((action, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <span className="w-6 h-6 flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full">
                                {i + 1}
                            </span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{action}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Performers & Slow Moving */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-2">🔥 Top Performers</h4>
                    <ul className="space-y-1">
                        {data.topPerformers.map((p, i) => (
                            <li key={i} className="flex justify-between text-xs">
                                <span className="text-gray-700 dark:text-gray-300">{p.name}</span>
                                <span className="text-green-600">{p.soldCount} sold</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2">🐢 Slow Moving</h4>
                    <ul className="space-y-1">
                        {data.slowMovingItems.map((p, i) => (
                            <li key={i} className="flex justify-between text-xs">
                                <span className="text-gray-700 dark:text-gray-300">{p.name}</span>
                                <span className="text-orange-600">{p.stock} in stock</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

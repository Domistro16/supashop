import { useState, useEffect } from "react";
import { api, AIBusinessSummary as SummaryType } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  period?: 'daily' | 'monthly';
}

export default function AIBusinessSummary({ period = 'daily' }: Props) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryType | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'monthly'>(period);

  useEffect(() => {
    loadSummary();
  }, [selectedPeriod]);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await api.ai.getBusinessSummary(selectedPeriod);
      setSummary(data);
    } catch (error) {
      console.error("Failed to load summary:", error);
      toast.error("Failed to load AI summary");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-2/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4/5"></div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-default dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                AI Business Summary
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedPeriod === 'daily' ? "Today's" : "This month's"} insights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as 'daily' | 'monthly')}
              className="text-sm border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {summary.summary}
          </p>
        </div>

        {/* Highlights */}
        {summary.highlights.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Key Highlights
            </h4>
            <div className="grid gap-2">
              {summary.highlights.map((highlight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                >
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {highlight}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Business Insights
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {summary.insights}
          </p>
        </div>
      </div>
    </div>
  );
}

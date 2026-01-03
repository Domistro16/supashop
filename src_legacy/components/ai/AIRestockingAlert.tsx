import { useState, useEffect } from "react";
import { api, AIRestockingSuggestions } from "@/lib/api";
import { toast } from "sonner";

export default function AIRestockingAlert() {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<AIRestockingSuggestions | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const data = await api.ai.getRestockingSuggestions();
      setSuggestions(data);
    } catch (error) {
      console.error("Failed to load restocking suggestions:", error);
      toast.error("Failed to load inventory insights");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!suggestions) {
    return null;
  }

  const hasUrgentRestocks = suggestions.urgentRestocks.length > 0;

  return (
    <div
      className={`rounded-xl border ${
        hasUrgentRestocks
          ? "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20"
          : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
      } shadow-default`}
    >
      <div
        className="px-3 py-2.5 sm:px-4 sm:py-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                hasUrgentRestocks
                  ? "bg-orange-100 dark:bg-orange-900/40"
                  : "bg-green-100 dark:bg-green-900/30"
              }`}
            >
              {hasUrgentRestocks ? (
                <svg
                  className="w-4 h-4 text-orange-600 dark:text-orange-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-green-600 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white">
                AI Inventory Insights
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                {hasUrgentRestocks
                  ? `${suggestions.urgentRestocks.length} items need restocking`
                  : "Stock levels look good"}
              </p>
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-3 sm:space-y-4">
          {/* Urgent Restocks */}
          {hasUrgentRestocks && (
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2">
                Urgent Restocks Required
              </h4>
              <div className="space-y-1.5">
                {suggestions.urgentRestocks.map((item, index) => (
                  <div
                    key={index}
                    className="p-2 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-white truncate">
                          {item.productName}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          {item.reason}
                        </p>
                      </div>
                      <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/40 rounded whitespace-nowrap">
                        Stock: {item.currentStock}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {suggestions.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                AI Recommendations
              </h4>
              <ul className="space-y-1.5">
                {suggestions.recommendations.map((rec, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400"
                  >
                    <svg
                      className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Insights */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-3">
            <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Inventory Insights
            </h4>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {suggestions.insights}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

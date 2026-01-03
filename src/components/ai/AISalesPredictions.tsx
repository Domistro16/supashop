import { useState, useEffect } from "react";
import { api, AIPredictions } from "@/lib/api";
import { toast } from "sonner";

export default function AISalesPredictions() {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<AIPredictions | null>(null);

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const data = await api.ai.getSalesPredictions();
      setPredictions(data);
    } catch (error) {
      console.error("Failed to load predictions:", error);
      toast.error("Failed to load AI predictions");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!predictions) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-default dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 dark:border-gray-800 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <svg
              className="w-4 h-4 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white">
              AI Sales Predictions
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              Powered by Gemini AI
            </p>
          </div>
        </div>
        <button
          onClick={loadPredictions}
          className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
        >
          Refresh
        </button>
      </div>

      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Predictions */}
        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Next Week Forecast
          </h4>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {predictions.predictions}
          </p>
        </div>

        {/* Trends */}
        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Key Trends
          </h4>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            {predictions.trends}
          </p>
        </div>

        {/* Recommendations */}
        {predictions.recommendations.length > 0 && (
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              AI Recommendations
            </h4>
            <ul className="space-y-1.5">
              {predictions.recommendations.map((rec, index) => (
                <li
                  key={index}
                  className="flex items-start gap-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400"
                >
                  <svg
                    className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

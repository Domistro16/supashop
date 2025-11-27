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
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!predictions) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-default dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <svg
              className="w-5 h-5 text-purple-600 dark:text-purple-400"
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
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              AI Sales Predictions
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Powered by Gemini AI
            </p>
          </div>
        </div>
        <button
          onClick={loadPredictions}
          className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
        >
          Refresh
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Predictions */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Next Week Forecast
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {predictions.predictions}
          </p>
        </div>

        {/* Trends */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Key Trends
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {predictions.trends}
          </p>
        </div>

        {/* Recommendations */}
        {predictions.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              AI Recommendations
            </h4>
            <ul className="space-y-2">
              {predictions.recommendations.map((rec, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <svg
                    className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5"
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

import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "@/lib/react-router-compat";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import Spinner from "../ui/Spinner";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export default function CommandPalette({ isOpen, onClose, inputRef }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { results, isLoading } = useCommandPalette(query);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
          break;
        case "Enter":
          e.preventDefault();
          if (results[selectedIndex]) {
            executeCommand(results[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          handleClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const executeCommand = (result: any) => {
    if (result.action) {
      result.action();
    } else if (result.path) {
      navigate(result.path);
    }
    handleClose();
  };

  const handleClose = () => {
    setQuery("");
    setSelectedIndex(0);
    onClose();
    inputRef.current?.blur();
  };

  // Listen for input changes from the header input
  useEffect(() => {
    if (!inputRef.current) return;

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      setQuery(target.value);
    };

    inputRef.current.addEventListener("input", handleInput);
    return () => inputRef.current?.removeEventListener("input", handleInput);
  }, [inputRef]);

  // Sync input value with query
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = query;
    }
  }, [query]);

  // Clear input when closing
  useEffect(() => {
    if (!isOpen && inputRef.current) {
      inputRef.current.value = "";
      setQuery("");
    }
  }, [isOpen]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, any[]> = {};
    results.forEach((result) => {
      if (!groups[result.category]) {
        groups[result.category] = [];
      }
      groups[result.category].push(result);
    });
    return groups;
  }, [results]);

  if (!isOpen) return null;



  const categoryIcons: Record<string, string> = {
    Navigation: "🧭",
    Products: "📦",
    Customers: "👥",
    Transactions: "💰",
    Staff: "👤",
    Actions: "⚡",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9998]"
        onClick={handleClose}
      />

      {/* Command Palette */}
      <div className="fixed top-[80px] left-1/2 -translate-x-1/2 w-full max-w-2xl z-[9999] px-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Results */}
          <div
            ref={resultsRef}
            className="max-h-[400px] overflow-y-auto custom-scrollbar"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="md" />
              </div>
            ) : results.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  {query ? "No results found" : "Type to search products, customers, transactions..."}
                </p>
                {!query && (
                  <div className="mt-4 text-sm text-gray-400 dark:text-gray-500">
                    <p>Try searching for:</p>
                    <p className="mt-1">"products" • "customers" • "sales" • "create sale"</p>
                  </div>
                )}
              </div>
            ) : (
              Object.entries(groupedResults).map(([category, items]) => (
                <div key={category} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                    <span className="mr-2">{categoryIcons[category]}</span>
                    {category}
                  </div>
                  {items.map((result, index) => {
                    const globalIndex = results.indexOf(result);
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <button
                        key={result.id}
                        onClick={() => executeCommand(result)}
                        className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-600"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }`}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xl">
                          {result.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {result.title}
                          </div>
                          {result.subtitle && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {result.subtitle}
                            </div>
                          )}
                        </div>
                        {result.badge && (
                          <div className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            {result.badge}
                          </div>
                        )}
                        {isSelected && (
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            ↵
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded ml-1">↓</kbd>
                  <span className="ml-1">Navigate</span>
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">↵</kbd>
                  <span className="ml-1">Select</span>
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">esc</kbd>
                  <span className="ml-1">Close</span>
                </span>
              </div>
              <div>
                {results.length} result{results.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

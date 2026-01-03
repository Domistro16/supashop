import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

interface CategorySuggestProps {
  productName: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Keyword mapping for intelligent suggestions
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Clothes': ['shirt', 'pant', 'dress', 'jean', 'trouser', 'skirt', 'blouse', 'jacket', 'coat', 'sweater', 'hoodie', 'shorts', 'tshirt', 't-shirt', 'polo', 'suit', 'tie', 'sock', 'underwear'],
  'Footwear': ['shoe', 'boot', 'sandal', 'slipper', 'sneaker', 'heel', 'loafer', 'flip-flop', 'trainer'],
  'Electronics': ['phone', 'laptop', 'computer', 'tablet', 'headphone', 'speaker', 'charger', 'cable', 'mouse', 'keyboard', 'monitor', 'tv', 'camera', 'watch', 'earbud'],
  'Food': ['rice', 'bread', 'milk', 'egg', 'meat', 'chicken', 'fish', 'vegetable', 'fruit', 'snack', 'drink', 'juice', 'water', 'tea', 'coffee', 'sugar', 'salt', 'oil', 'flour', 'pasta'],
  'Beverages': ['juice', 'soda', 'water', 'tea', 'coffee', 'drink', 'cola', 'beer', 'wine', 'liquor'],
  'Cosmetics': ['lipstick', 'makeup', 'perfume', 'lotion', 'cream', 'powder', 'foundation', 'mascara', 'shampoo', 'soap', 'nail', 'polish'],
  'Accessories': ['bag', 'purse', 'wallet', 'belt', 'hat', 'cap', 'scarf', 'glove', 'sunglasses', 'jewelry', 'bracelet', 'necklace', 'ring', 'earring'],
  'Books': ['book', 'novel', 'magazine', 'comic', 'textbook', 'notebook', 'journal'],
  'Toys': ['toy', 'doll', 'game', 'puzzle', 'lego', 'action figure'],
  'Sports': ['ball', 'bat', 'racket', 'gym', 'fitness', 'bicycle', 'skateboard'],
  'Home': ['furniture', 'chair', 'table', 'bed', 'sofa', 'lamp', 'curtain', 'rug', 'pillow', 'blanket'],
  'Kitchen': ['plate', 'cup', 'glass', 'spoon', 'fork', 'knife', 'pot', 'pan', 'bowl', 'dish'],
  'Stationery': ['pen', 'pencil', 'eraser', 'ruler', 'marker', 'crayon', 'paper', 'stapler', 'clip'],
};

export default function CategorySuggest({
  productName,
  value,
  onChange,
  placeholder = "Enter Category",
  className = "",
}: CategorySuggestProps) {
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch existing categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const categories = await api.products.getCategories();
        setExistingCategories(categories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Generate suggestions based on product name
  useEffect(() => {
    if (!productName || productName.length < 2) {
      setSuggestions([]);
      return;
    }

    const productNameLower = productName.toLowerCase();
    const suggestedCategories = new Set<string>();

    // 1. Check keyword matching
    Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
      if (keywords.some(keyword => productNameLower.includes(keyword))) {
        suggestedCategories.add(category);
      }
    });

    // 2. Add existing categories that match
    existingCategories.forEach(category => {
      if (category.toLowerCase().includes(productNameLower) ||
          productNameLower.includes(category.toLowerCase())) {
        suggestedCategories.add(category);
      }
    });

    // 3. Add all existing categories if we have suggestions (for user to browse)
    const finalSuggestions = Array.from(suggestedCategories);

    // Add other existing categories that aren't already in suggestions
    existingCategories.forEach(cat => {
      if (!finalSuggestions.includes(cat) && finalSuggestions.length < 10) {
        finalSuggestions.push(cat);
      }
    });

    setSuggestions(finalSuggestions);
  }, [productName, existingCategories]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (category: string) => {
    onChange(category);
    setShowSuggestions(false);
  };

  const filteredSuggestions = value
    ? suggestions.filter(cat =>
        cat.toLowerCase().includes(value.toLowerCase())
      )
    : suggestions;

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
        className={className}
      />

      {/* Suggestions indicator */}
      {suggestions.length > 0 && !showSuggestions && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 dark:text-blue-400">
          {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && (filteredSuggestions.length > 0 || productName.length >= 2) && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              Loading categories...
            </div>
          ) : filteredSuggestions.length > 0 ? (
            <>
              {productName.length >= 2 && suggestions.length > 0 && (
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                  💡 Suggested for "{productName}"
                </div>
              )}
              <div>
                {filteredSuggestions.map((category, index) => {
                  const isTopSuggestion = index < Math.min(3, suggestions.length) &&
                                         productName.length >= 2 &&
                                         Object.keys(CATEGORY_KEYWORDS).includes(category) &&
                                         CATEGORY_KEYWORDS[category].some(kw =>
                                           productName.toLowerCase().includes(kw)
                                         );

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleSelectSuggestion(category)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                        isTopSuggestion ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium text-gray-900 dark:text-white/90 ${
                          isTopSuggestion ? 'text-blue-700 dark:text-blue-400' : ''
                        }`}>
                          {category}
                        </span>
                        {isTopSuggestion && (
                          <span className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded-full">
                            Suggested
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : value && (
            <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
              No matching categories. Press Enter to create "{value}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

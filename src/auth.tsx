import { useEffect, useState, createContext, useContext } from "react";
import api, { type User, type Shop } from "./lib/api";

interface AuthContextType {
  user: User | null;
  shops: Shop[];
  currentShop: Shop | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setCurrentShop: (shopId: string) => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  shops: [],
  currentShop: null,
  isLoading: true,
  isAuthenticated: false,
  setCurrentShop: () => {},
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [currentShop, setCurrentShopState] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAuthState = async () => {
    try {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        setUser(null);
        setShops([]);
        setCurrentShopState(null);
        setIsLoading(false);
        return;
      }

      // Get user info and shops
      const response = await api.auth.getUser();
      setUser(response.user);
      setShops(response.shops);

      // Store shops for permission checking
      localStorage.setItem('user_shops', JSON.stringify(response.shops));

      // Set current shop
      const currentShopId = api.shops.getCurrentShopId();
      const shop = response.shops.find(s => s.id === currentShopId) || response.shops[0] || null;

      if (shop) {
        setCurrentShopState(shop);
        api.shops.setCurrentShop(shop.id);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load auth state:', error);

      // Clear invalid token
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_shop_id');
      localStorage.removeItem('user_shops');

      setUser(null);
      setShops([]);
      setCurrentShopState(null);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuthState();

    // Listen for storage changes (multi-tab support)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token' || e.key === 'current_shop_id') {
        loadAuthState();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setCurrentShop = (shopId: string) => {
    const shop = shops.find(s => s.id === shopId);
    if (shop) {
      setCurrentShopState(shop);
      api.shops.setCurrentShop(shopId);
    }
  };

  const refreshAuth = async () => {
    await loadAuthState();
  };

  const value: AuthContextType = {
    user,
    shops,
    currentShop,
    isLoading,
    isAuthenticated: !!user,
    setCurrentShop,
    refreshAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading ? children : <div>Loading...</div>}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api, { User, Shop } from '@/lib/api';

interface UserContextType {
  user: User | null;
  shops: Shop[];
  currentShop: Shop | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  updateUserProfile: (name: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.auth.getUser();
      setUser(data.user);
      setShops(data.shops);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const currentShopId = api.shops.getCurrentShopId();
  const currentShop = shops.find(s => s.id === currentShopId) || shops[0] || null;

  const updateUserProfile = async (name: string) => {
    try {
      const response = await api.auth.updateProfile({ name });
      setUser(response.user);
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        shops,
        currentShop,
        loading,
        error,
        refreshUser: fetchUser,
        updateUserProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

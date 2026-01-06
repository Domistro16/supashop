import React, { createContext, useContext, useCallback, useState } from "react";
import { getProducts, getSales, getShop, getRecentItems } from "@/supabaseClient";
import { Product } from "@/page-components/Products/Columns";
import { Transaction } from "@/page-components/Transaction/Columns";

interface DataRefreshContextType {
  // Data
  products: Product[];
  sales: Transaction[];
  shop: any;
  recentItems: any[];
  // Setters (for external updates)
  setProducts: (products: Product[]) => void;
  setSales: (sales: Transaction[]) => void;
  setShop: (shop: any) => void;
  setRecentItems: (recent: any[]) => void;
  // Refresh functions
  refreshProducts: () => Promise<Product[] | undefined>;
  refreshSales: () => Promise<Transaction[] | undefined>;
  refreshShop: () => Promise<any>;
  refreshRecentItems: () => Promise<any[]>;
  refreshAll: () => Promise<void>;
}

const DataRefreshContext = createContext<DataRefreshContextType | undefined>(undefined);

export function useDataRefresh() {
  const context = useContext(DataRefreshContext);
  if (!context) {
    throw new Error("useDataRefresh must be used within a DataRefreshProvider");
  }
  return context;
}

interface DataRefreshProviderProps {
  children: React.ReactNode;
}

export function DataRefreshProvider({ children }: DataRefreshProviderProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Transaction[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [recentItems, setRecentItems] = useState<any[]>([]);

  const refreshProducts = useCallback(async () => {
    const data = await getProducts();
    if (data) {
      setProducts(data);
    }
    return data;
  }, []);

  const refreshSales = useCallback(async () => {
    const data = await getSales();
    if (data) {
      setSales(data);
    }
    return data;
  }, []);

  const refreshShop = useCallback(async () => {
    const data = await getShop();
    if (data) {
      setShop(data);
    }
    return data;
  }, []);

  const refreshRecentItems = useCallback(async () => {
    const data = await getRecentItems();
    if (data) {
      setRecentItems(data);
    }
    return data;
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshProducts(),
      refreshSales(),
      refreshShop(),
      refreshRecentItems(),
    ]);
  }, [refreshProducts, refreshSales, refreshShop, refreshRecentItems]);

  return (
    <DataRefreshContext.Provider
      value={{
        products,
        sales,
        shop,
        recentItems,
        setProducts,
        setSales,
        setShop,
        setRecentItems,
        refreshProducts,
        refreshSales,
        refreshShop,
        refreshRecentItems,
        refreshAll,
      }}
    >
      {children}
    </DataRefreshContext.Provider>
  );
}

import React, { createContext, useContext, useCallback } from "react";
import { getProducts, getSales, getShop, getRecentItems } from "@/supabaseClient";
import { Product } from "@/page-components/Products/Columns";
import { Transaction } from "@/page-components/Transaction/Columns";

interface DataRefreshContextType {
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
  setProducts: (products: Product[]) => void;
  setSales: (sales: Transaction[]) => void;
  setShop: (shop: any) => void;
  setRecent: (recent: any[]) => void;
}

export function DataRefreshProvider({
  children,
  setProducts,
  setSales,
  setShop,
  setRecent,
}: DataRefreshProviderProps) {
  const refreshProducts = useCallback(async () => {
    const data = await getProducts();
    if (data) {
      setProducts(data);
    }
    return data;
  }, [setProducts]);

  const refreshSales = useCallback(async () => {
    const data = await getSales();
    if (data) {
      setSales(data);
    }
    return data;
  }, [setSales]);

  const refreshShop = useCallback(async () => {
    const data = await getShop();
    if (data) {
      setShop(data);
    }
    return data;
  }, [setShop]);

  const refreshRecentItems = useCallback(async () => {
    const data = await getRecentItems();
    if (data) {
      setRecent(data);
    }
    return data;
  }, [setRecent]);

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

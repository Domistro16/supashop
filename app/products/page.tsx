'use client'

import { useEffect, useState } from 'react'
import ProductsPage from '@/pages/Products/product'
import { getProducts } from '@/supabaseClient'
import { Product } from '@/pages/Products/Columns'
import Spinner from '@/components/ui/Spinner'
import { DataRefreshProvider } from '@/context/DataRefreshContext'

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const productsData = await getProducts()
        setProducts(productsData || [])
      } catch (error) {
        console.error('Failed to fetch products:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <Spinner size="lg" />
  }

  return (
    <DataRefreshProvider
      setProducts={setProducts}
      setSales={() => {}}
      setShop={() => {}}
      setRecent={() => {}}
    >
      <ProductsPage products={products} />
    </DataRefreshProvider>
  )
}

'use client'

import { useEffect, useState } from 'react'
import TransactionPage from '@/page-components/Transaction/transaction'
import { getSales } from '@/supabaseClient'
import { Transaction } from '@/page-components/Transaction/Columns'
import Spinner from '@/components/ui/Spinner'
import { DataRefreshProvider } from '@/context/DataRefreshContext'

export default function SalesPage() {
  const [sales, setSales] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const salesData = await getSales()
        setSales(salesData || [])
      } catch (error) {
        console.error('Failed to fetch sales data:', error)
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
      setProducts={() => {}}
      setSales={setSales}
      setShop={() => {}}
      setRecent={() => {}}
    >
      <TransactionPage sales={sales} />
    </DataRefreshProvider>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { getSales } from '@/supabaseClient'
import { Transaction } from '@/page-components/Transaction/Columns'
import Single from '@/page-components/Transaction/single'
import Spinner from '@/components/ui/Spinner'

export default function TransactionDetailPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSales() {
      try {
        const data = await getSales()
        setTransactions(data || [])
      } catch (error) {
        console.error('Failed to fetch sales:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSales()
  }, [])

  if (loading) {
    return <Spinner size="lg" />
  }

  return <Single transactions={transactions} />
}

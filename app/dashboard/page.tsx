'use client'

import { useEffect, useState } from 'react'
import Home from '@/page-components/Dashboard/Home'
import { getSales, getShop, getRecentItems, getDashboardStats } from '@/supabaseClient'
import { Transaction } from '@/page-components/Transaction/Columns'
import Spinner from '@/components/ui/Spinner'
import { DataRefreshProvider } from '@/context/DataRefreshContext'

export default function DashboardPage() {
  const [sales, setSales] = useState<Transaction[]>([])
  const [shop, setShop] = useState<any>({ target: 0 })
  const [recent, setRecent] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [salesData, shopData, recentData, statsData] = await Promise.all([
          getSales(),
          getShop(),
          getRecentItems(),
          getDashboardStats(),
        ])
        setSales(salesData || [])
        setShop(shopData || { target: 0 })
        setRecent(recentData || [])
        setStats(statsData)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
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
      setProducts={() => { }}
      setSales={setSales}
      setShop={setShop}
      setRecent={setRecent}
    >
      <Home sales={sales} shop={shop} items={recent} stats={stats} />
    </DataRefreshProvider>
  )
}

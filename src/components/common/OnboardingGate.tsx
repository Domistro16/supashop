'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useUser } from '@/context/UserContext'

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { currentShop, loading } = useUser()

  useEffect(() => {
    if (loading || !currentShop) return
    if (pathname?.startsWith('/onboarding')) return
    // Only owners see the wizard — staff join shops that are already set up
    if (!currentShop.isOwner) return
    if (currentShop.onboardingCompleted === false) {
      router.replace('/onboarding')
    }
  }, [loading, currentShop, pathname, router])

  return <>{children}</>
}

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Spinner from '@/components/ui/Spinner'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard or auth page based on login status
    const token = localStorage.getItem('auth_token')
    if (token) {
      router.push('/dashboard')
    } else {
      router.push('/auth/signin')
    }
  }, [router])

  return <Spinner size="lg" />
}

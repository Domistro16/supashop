'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard or auth page based on login status
    const token = localStorage.getItem('token')
    if (token) {
      router.push('/dashboard')
    } else {
      router.push('/auth/signin')
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Loading...</p>
    </div>
  )
}

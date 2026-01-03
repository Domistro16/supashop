'use client'

import { useRouter as useNextRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

// Wrapper to make Next.js router compatible with react-router-dom API
export function useNavigate() {
  const router = useNextRouter()
  return (to: string) => router.push(to)
}

export function useLocation() {
  const pathname = usePathname()
  return { pathname }
}

// Export Next.js Link as default for compatibility
export { Link }
export { useNextRouter as useRouter }

'use client'

// Compatibility shim for react-router to Next.js migration
import { useRouter as useNextRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ComponentProps } from 'react'

export function useNavigate() {
  const router = useNextRouter()
  return (to: string | number, options?: any) => {
    if (typeof to === 'number') {
      if (to === -1) router.back()
      else if (to === 1) router.forward()
    } else {
      if (options?.replace) {
        router.replace(to)
      } else {
        router.push(to)
      }
    }
  }
}

export function useLocation() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  return {
    pathname,
    search: searchParams?.toString() ? `?${searchParams.toString()}` : '',
    hash: typeof window !== 'undefined' ? window.location.hash : '',
  }
}

export function useParams() {
  // This would need dynamic route params - for now return empty
  return {}
}

// Link component wrapper
export function RouterLink({ to, ...props }: ComponentProps<typeof Link> & { to: string }) {
  return <Link href={to} {...props} />
}

export { Link }
export { useNextRouter as useRouter }

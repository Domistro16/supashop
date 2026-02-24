'use client'

// Compatibility shim for react-router to Next.js migration
import { useRouter as useNextRouter, usePathname } from 'next/navigation'
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
  return {
    pathname,
    search: typeof window !== 'undefined' ? window.location.search : '',
    hash: typeof window !== 'undefined' ? window.location.hash : '',
  }
}

export function useParams() {
  // This would need dynamic route params - for now return empty
  return {} as Record<string, string>
}

// Link component wrapper
export function RouterLink({ to, ...props }: any) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { href, ...otherProps } = props;
  return <Link href={to} {...otherProps} />
}

export { Link }
export { useNextRouter as useRouter }

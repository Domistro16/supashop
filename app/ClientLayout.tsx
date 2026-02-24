'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { HelmetProvider } from 'react-helmet-async'
import { SidebarProvider } from '@/context/SidebarContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { UserProvider } from '@/context/UserContext'
import { DataRefreshProvider } from '@/context/DataRefreshContext'
import { AuthProvider } from '@/auth'
import AppLayout from '@/layout/AppLayout'
import Spinner from '@/components/ui/Spinner'
import { Toaster } from 'react-hot-toast'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthPage, setIsAuthPage] = useState(false)
  const [isStorefront, setIsStorefront] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  useEffect(() => {
    // Detect if we're on a storefront subdomain
    const hostname = window.location.hostname
    const parts = hostname.split('.')
    const isVercelUrl = hostname.endsWith('vercel.app')

    // Determine if we have a subdomain based on URL type:
    // - Vercel: "supashop.vercel.app" (3 parts) = no subdomain, "hulop.supashop.vercel.app" (4+ parts) = subdomain
    // - Localhost: "localhost" (1 part) = no subdomain, "hulop.localhost" (2+ parts) = subdomain  
    // - Production: "supashop.com" (2 parts) = no subdomain, "hulop.supashop.com" (3+ parts) = subdomain
    let hasSubdomain = false
    if (isVercelUrl) {
      hasSubdomain = parts.length > 3
    } else if (hostname.includes('localhost')) {
      hasSubdomain = parts.length > 1
    } else {
      hasSubdomain = parts.length > 2
    }
    const subdomain = hasSubdomain ? parts[0] : null
    const isShopSubdomain = hasSubdomain && subdomain !== 'www' && subdomain !== 'app'

    // Only treat as storefront if on subdomain AND not on an excluded path (auth, dashboard, etc.)
    const excludedPaths = ['/auth/', '/dashboard', '/products', '/sales', '/customers', '/staff', '/suppliers', '/reports', '/roles', '/profile', '/calendar']
    const isExcludedPath = excludedPaths.some(path => pathname.startsWith(path))
    const isActualStorefront = (isShopSubdomain || pathname.startsWith('/shop/')) && !isExcludedPath
    setIsStorefront(isActualStorefront)

    const authPages = ['/auth/signin', '/auth/signup', '/']
    const isAuth = authPages.includes(pathname)
    const isPublicPage = isAuth || isActualStorefront
    setIsAuthPage(isPublicPage)

    // Check authentication
    const token = localStorage.getItem('auth_token')
    setIsAuthenticated(!!token)

    // Redirect unauthenticated users to signin (except for auth pages, root, and shop subdomains)
    if (!token && !isPublicPage) {
      router.push('/auth/signin')
    } else {
      setIsLoading(false)
    }
  }, [pathname, router])

  // Show loading spinner while checking auth
  if (isLoading && !isAuthPage && !isStorefront) {
    return (
      <HelmetProvider>
        <ThemeProvider>
          <Spinner size="lg" />
        </ThemeProvider>
      </HelmetProvider>
    )
  }

  // Storefront routes get minimal layout - they have their own layout in app/shop/
  if (isStorefront) {
    return (
      <ThemeProvider>
        {children}
      </ThemeProvider>
    )
  }

  if (isAuthPage) {
    return (
      <HelmetProvider>
        <ThemeProvider>
          <AuthProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: { background: '#333', color: '#fff' },
                success: { duration: 3000, iconTheme: { primary: '#10b981', secondary: '#fff' } },
                error: { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />
            <SonnerToaster position="top-right" />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </HelmetProvider>
    )
  }

  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <UserProvider>
            <SidebarProvider>
              <DataRefreshProvider>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: { background: '#333', color: '#fff' },
                    success: { duration: 3000, iconTheme: { primary: '#10b981', secondary: '#fff' } },
                    error: { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                  }}
                />
                <SonnerToaster position="top-right" />
                <AppLayout>{children}</AppLayout>
              </DataRefreshProvider>
            </SidebarProvider>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SidebarProvider } from '@/context/SidebarContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { UserProvider } from '@/context/UserContext'
import { AuthProvider } from '@/auth'
import AppLayout from '@/layout/AppLayout'
import Spinner from '@/components/ui/Spinner'
import { Toaster } from 'react-hot-toast'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthPage, setIsAuthPage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const authPages = ['/auth/signin', '/auth/signup', '/']
    const isAuth = authPages.includes(pathname)
    setIsAuthPage(isAuth)

    // Check authentication
    const token = localStorage.getItem('auth_token')
    setIsAuthenticated(!!token)

    // Redirect unauthenticated users to signin (except for auth pages and root)
    if (!token && !isAuth) {
      router.push('/auth/signin')
    } else {
      setIsLoading(false)
    }
  }, [pathname, router])

  // Show loading spinner while checking auth
  if (isLoading && !isAuthPage) {
    return (
      <ThemeProvider>
        <Spinner size="lg" />
      </ThemeProvider>
    )
  }

  if (isAuthPage) {
    return (
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
          {children}
        </AuthProvider>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <UserProvider>
          <SidebarProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: { background: '#333', color: '#fff' },
                success: { duration: 3000, iconTheme: { primary: '#10b981', secondary: '#fff' } },
                error: { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />
            <AppLayout>{children}</AppLayout>
          </SidebarProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

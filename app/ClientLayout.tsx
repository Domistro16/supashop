'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SidebarProvider } from '@/context/SidebarContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { UserProvider } from '@/context/UserContext'
import AppLayout from '@/layout/AppLayout'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthPage, setIsAuthPage] = useState(false)

  useEffect(() => {
    const authPages = ['/auth/signin', '/auth/signup']
    setIsAuthPage(authPages.includes(pathname))
  }, [pathname])

  if (isAuthPage) {
    return (
      <ThemeProvider>
        {children}
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <UserProvider>
        <SidebarProvider>
          <AppLayout>{children}</AppLayout>
        </SidebarProvider>
      </UserProvider>
    </ThemeProvider>
  )
}

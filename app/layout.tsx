import type { Metadata, Viewport } from 'next'
import './globals.css'
import ClientLayout from './ClientLayout'

export const metadata: Metadata = {
  title: 'SupaShop - Shop Management System',
  description: 'Complete shop management solution with inventory, POS, and analytics',
  manifest: '/manifest.json',
  applicationName: 'Supashop',
  appleWebApp: {
    capable: true,
    title: 'Supashop',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/android-chrome-192x192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

// Force dynamic rendering for all routes to avoid SSR issues with client-only code
export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}

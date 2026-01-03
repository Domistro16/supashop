import type { Metadata } from 'next'
import '@/index.css'
import ClientLayout from './ClientLayout'

export const metadata: Metadata = {
  title: 'SupaShop - Shop Management System',
  description: 'Complete shop management solution with inventory, POS, and analytics',
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

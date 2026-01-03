import type { Metadata } from 'next'
import '@/index.css'

export const metadata: Metadata = {
  title: 'SupaShop - Shop Management System',
  description: 'Complete shop management solution with inventory, POS, and analytics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

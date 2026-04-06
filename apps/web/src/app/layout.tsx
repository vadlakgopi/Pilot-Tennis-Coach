import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import ConditionalLayout from '@/components/layout/ConditionalLayout'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  fallback: ['system-ui', 'arial', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'Tennis Buddy - Your Tennis Performance Coach',
  description: 'AI-powered tennis match analytics and performance insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <ConditionalLayout>{children}</ConditionalLayout>
        </Providers>
      </body>
    </html>
  )
}


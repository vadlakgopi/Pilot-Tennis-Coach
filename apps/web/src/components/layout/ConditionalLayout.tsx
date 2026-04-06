'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {!isLoginPage && <Navbar />}
      <main className={isLoginPage ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto'}>
        {children}
      </main>
    </div>
  )
}


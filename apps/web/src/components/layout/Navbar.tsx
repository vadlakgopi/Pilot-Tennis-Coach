'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import UserDropdown from './UserDropdown'
import LoginDropdown from './LoginDropdown'

export default function Navbar() {
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth_token')
        setIsAuthenticated(!!token)
      }
    }
    checkAuth()
    // Also listen for storage changes (e.g., when user logs in/out)
    window.addEventListener('storage', checkAuth)
    return () => window.removeEventListener('storage', checkAuth)
  }, [pathname])

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/matches', label: 'Matches', icon: '🎾' },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">🎾</span>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Tennis Buddy
            </span>
          </Link>

          <div className="flex items-center space-x-1">
            {/* Hide nav items on login page */}
            {pathname !== '/login' && navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
            {/* Show LoginDropdown when not authenticated, UserDropdown when authenticated */}
            <div className={pathname !== '/login' ? 'ml-4 pl-4 border-l border-gray-200' : ''}>
              {isAuthenticated ? <UserDropdown /> : <LoginDropdown />}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}




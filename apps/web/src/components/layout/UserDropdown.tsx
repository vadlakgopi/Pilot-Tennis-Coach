'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/lib/api'

export default function UserDropdown() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch user profile
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => usersApi.getProfile(),
    retry: false,
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    router.push('/login')
  }

  const handleAccountDetails = () => {
    setIsOpen(false)
    router.push('/account')
  }

  // Don't show dropdown if not authenticated
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  if (!token) {
    return null
  }

  const userInitial = user?.username?.charAt(0).toUpperCase() || 'U'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="User menu"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
          {userInitial}
        </div>
        <span className="text-gray-700 hidden sm:block">
          {isLoading ? 'Loading...' : user?.username || 'User'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{user?.username || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
          </div>
          <button
            onClick={handleAccountDetails}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2"
          >
            <span>👤</span>
            <span>Account Details</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  )
}




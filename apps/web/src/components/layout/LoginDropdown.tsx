'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/lib/api'

export default function LoginDropdown() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const login = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authApi.login(username, password),
    onSuccess: (data) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.access_token)
        if (data.user) {
          localStorage.setItem('user_info', JSON.stringify(data.user))
        }
        router.push('/')
        router.refresh()
      }
    },
    onError: () => {
      setError('Invalid username or password. Please try again.')
    },
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!username || !password) return
    login.mutate({ username, password })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        aria-label="Sign in"
      >
        <span>🔐</span>
        <span className="hidden sm:block">Sign In</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Sign In</h3>
          
          {error && (
            <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. testuser"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {login.isPending ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-3 text-xs text-gray-500 text-center">
            Test: <code className="bg-gray-100 px-1 py-0.5 rounded">testuser / testpassword123</code>
          </div>
        </div>
      )}
    </div>
  )
}




'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Only check on client side
    if (typeof window === 'undefined') {
      return
    }

    const verifyAuth = async () => {
      const token = localStorage.getItem('auth_token')
      
      // If no token, redirect immediately
      if (!token) {
        router.replace('/login')
        setIsAuthenticated(false)
        return
      }

      // Verify token with backend API
      try {
        await authApi.getCurrentUser()
        // Token is valid, allow rendering
        setIsAuthenticated(true)
      } catch (error: any) {
        // Token is invalid or expired
        // Note: API interceptor may also redirect on 401, but we handle it here too
        console.error('Authentication verification failed:', error)
        localStorage.removeItem('auth_token')
        router.replace('/login')
        setIsAuthenticated(false)
      }
    }

    // Verify authentication on mount
    verifyAuth()
  }, [router])

  // During SSR or while verifying, show loading state
  // This prevents any content from flashing before auth check completes
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // Only render children if authenticated
  // If not authenticated, the redirect should have happened, but guard against it anyway
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}


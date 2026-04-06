'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'

export function useAuth() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }

      // Verify token is still valid by checking current user
      try {
        await authApi.getCurrentUser()
        setIsAuthenticated(true)
      } catch (error) {
        // Token is invalid, clear it
        localStorage.removeItem('auth_token')
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  return { isAuthenticated, isLoading }
}




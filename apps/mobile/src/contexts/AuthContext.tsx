import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authApi } from '@/lib/api'

interface User {
  id: number
  username: string
  email: string
  full_name?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('[AuthContext] Loading timeout - forcing isLoading to false')
        setIsLoading(false)
      }
    }, 5000) // 5 second timeout
    
    loadAuthState()
    
    return () => clearTimeout(timeoutId)
  }, [])

  const loadAuthState = async () => {
    try {
      console.log('[AuthContext] Loading auth state...')
      const storedToken = await AsyncStorage.getItem('auth_token')
      console.log('[AuthContext] Stored token exists:', !!storedToken)
      
      if (storedToken) {
        setToken(storedToken)
        // Verify token by fetching user
        try {
          console.log('[AuthContext] Verifying token...')
          const userData = await authApi.getCurrentUser()
          console.log('[AuthContext] User data loaded:', !!userData)
          setUser(userData)
        } catch (error) {
          console.log('[AuthContext] Token invalid, clearing...')
          // Token invalid, clear it
          await AsyncStorage.removeItem('auth_token')
          setToken(null)
        }
      } else {
        console.log('[AuthContext] No stored token found')
      }
    } catch (error) {
      console.error('[AuthContext] Error loading auth state:', error)
    } finally {
      console.log('[AuthContext] Auth state loading complete')
      setIsLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    try {
      const response = await authApi.login(username, password)
      const { access_token } = response
      
      await AsyncStorage.setItem('auth_token', access_token)
      setToken(access_token)
      
      // Fetch user data
      const userData = await authApi.getCurrentUser()
      setUser(userData)
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed')
    }
  }

  const logout = async () => {
    await AsyncStorage.removeItem('auth_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}


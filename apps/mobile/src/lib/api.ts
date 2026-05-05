import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const getApiUrl = () => {
  return process.env.EXPO_PUBLIC_API_URL || 'http://192.168.4.20:8000/api/v1'
}

export const API_URL = getApiUrl()

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  maxRedirects: 5,
  validateStatus: (status) => status < 500,
  timeout: 10000,
})

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 — clear stored token (navigation is handled by AuthContext)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isAuthCheck = error.config?.url?.includes('auth/me')
    if (error.response?.status === 401 && !isAuthCheck) {
      await AsyncStorage.removeItem('auth_token')
    }
    return Promise.reject(error)
  }
)

const AUTH_TIMEOUT_MS = 30000

// Auth API
export const authApi = {
  login: async (username: string, password: string) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    const response = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: AUTH_TIMEOUT_MS,
    })
    if (response.status >= 400) {
      const error = new Error(response.data?.detail || 'Login failed')
      ;(error as any).response = response
      throw error
    }
    if (!response.data?.access_token) {
      throw new Error('Invalid login response')
    }
    return response.data
  },
  register: async (data: { email: string; username: string; password: string }) => {
    const response = await api.post('/auth/register', data)
    return response.data
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me', { timeout: AUTH_TIMEOUT_MS })
    if (response.status >= 400) {
      const err = new Error(response.data?.detail || 'Token invalid')
      ;(err as any).response = response
      throw err
    }
    return response.data
  },
}

// Users API
export const usersApi = {
  getProfile: async () => {
    const response = await api.get('/users/me')
    return response.data
  },
  updateProfile: async (data: { email?: string; username?: string }) => {
    const response = await api.put('/users/me', data)
    return response.data
  },
}

// Matches API
export const matchesApi = {
  list: async (sortBy?: string, sortOrder?: string) => {
    try {
      const params: Record<string, string> = {}
      if (sortBy && sortBy.trim()) params.sort_by = sortBy.trim()
      if (sortOrder && sortOrder.trim()) params.sort_order = sortOrder.trim()
      const response = await api.get('/matches/', { params })
      if (response.status === 401 || response.status === 403) {
        const err = new Error(
          response.status === 401 ? '401 Unauthorized' : '403 Forbidden'
        ) as Error & { response?: typeof response }
        err.response = response
        throw err
      }
      if (response.status >= 200 && response.status < 300) {
        return Array.isArray(response.data) ? response.data : []
      }
      return []
    } catch (error: any) {
      if (error.response?.status === 401) throw error
      return []
    }
  },
  get: async (matchId: number) => {
    const response = await api.get(`/matches/${matchId}`)
    if (response.status >= 400) {
      const err = new Error(response.data?.detail || 'Match not found')
      ;(err as any).response = response
      throw err
    }
    return response.data
  },
  create: async (data: any) => {
    const response = await api.post('/matches', data)
    if (response.status >= 400) {
      const err = new Error(response.data?.detail || 'Create failed') as Error & {
        response?: typeof response
      }
      err.response = response
      throw err
    }
    return response.data
  },
  update: async (matchId: number, data: any) => {
    const response = await api.put(`/matches/${matchId}`, data)
    if (response.status >= 400) {
      const err = new Error(response.data?.detail || 'Update failed')
      ;(err as any).response = response
      throw err
    }
    return response.data
  },
  uploadVideo: async (matchId: number, uri: string, onProgress?: (progress: number) => void) => {
    const token = await AsyncStorage.getItem('auth_token')
    const authHeader = token ? `Bearer ${token}` : undefined

    const uploadApi = axios.create({
      baseURL: API_URL,
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 600000, // 10 minutes for large video uploads
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    })

    const formData = new FormData()
    formData.append('file', {
      uri,
      type: 'video/mp4',
      name: 'match-video.mp4',
    } as any)

    const response = await uploadApi.post(`/matches/${matchId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          let percentCompleted = 0
          if (progressEvent.total && progressEvent.total > 0) {
            percentCompleted = Math.min(99, Math.round((progressEvent.loaded * 100) / progressEvent.total))
          } else if (progressEvent.loaded > 0) {
            percentCompleted = Math.min(50, Math.round(progressEvent.loaded / 100000))
          }
          onProgress(percentCompleted)
        }
      },
    })

    if (onProgress) onProgress(100)
    return response.data
  },
}

// Analytics API
export const analyticsApi = {
  getMatchStats: async (matchId: number) => {
    try {
      const response = await api.get(`/analytics/matches/${matchId}/stats`)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) return null
      throw error
    }
  },
  getHeatmap: async (matchId: number, playerNumber?: number) => {
    const params = playerNumber ? { player_number: playerNumber } : {}
    const response = await api.get(`/analytics/matches/${matchId}/heatmap`, { params })
    return response.data
  },
  getServeAnalysis: async (matchId: number, playerNumber?: number) => {
    const params = playerNumber ? { player_number: playerNumber } : {}
    const response = await api.get(`/analytics/matches/${matchId}/serves`, { params })
    return response.data
  },
  getPlayerComparison: async (matchId: number) => {
    const response = await api.get(`/analytics/matches/${matchId}/comparison`)
    return response.data
  },
  getHighlights: async (matchId: number) => {
    const response = await api.get(`/analytics/matches/${matchId}/highlights`)
    return response.data
  },
}

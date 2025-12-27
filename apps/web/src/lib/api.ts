import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  maxRedirects: 5, // Follow redirects
  validateStatus: (status) => status < 500, // Don't throw on 4xx errors
  timeout: 10000, // 10 second timeout to prevent hanging requests
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: async (username: string, password: string) => {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    const response = await api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  register: async (data: { email: string; username: string; password: string }) => {
    const response = await api.post('/auth/register', data)
    return response.data
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
}

// Matches API
export const matchesApi = {
  list: async (sortBy?: string, sortOrder?: string) => {
    try {
      const params: Record<string, string> = {}
      if (sortBy && sortBy.trim()) {
        params.sort_by = sortBy.trim()
      }
      if (sortOrder && sortOrder.trim()) {
        params.sort_order = sortOrder.trim()
      }
      const response = await api.get('/matches', { params }) // Remove trailing slash to match FastAPI route
      // Ensure we always return an array, even if the API returns null/undefined
      if (response.status >= 200 && response.status < 300) {
        return Array.isArray(response.data) ? response.data : []
      }
      console.warn('Unexpected response status:', response.status)
      return []
    } catch (error: any) {
      console.error('Error fetching matches:', error)
      // If it's a 401, let the interceptor handle it (redirect to login)
      if (error.response?.status === 401) {
        throw error
      }
      // For other errors, return empty array so page can still render
      console.warn('Failed to fetch matches, returning empty array')
      return []
    }
  },
  get: async (matchId: number) => {
    const response = await api.get(`/matches/${matchId}`)
    return response.data
  },
  create: async (data: any) => {
    const response = await api.post('/matches', data)
    return response.data
  },
  update: async (matchId: number, data: any) => {
    const response = await api.put(`/matches/${matchId}`, data)
    return response.data
  },
  uploadVideo: async (matchId: number, file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    
    // Get auth token
    const token = localStorage.getItem('auth_token')
    const authHeader = token ? `Bearer ${token}` : undefined
    
    // Create a separate axios instance for uploads with longer timeout and no max body size limit
    const uploadApi = axios.create({
      baseURL: API_URL,
      headers: authHeader ? { Authorization: authHeader } : {},
      timeout: 600000, // 10 minutes timeout for large video uploads
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    })
    
    const response = await uploadApi.post(`/matches/${matchId}/upload`, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          let percentCompleted = 0
          
          if (progressEvent.total && progressEvent.total > 0) {
            // Use the actual total from the progress event (more accurate)
            percentCompleted = Math.min(99, Math.round((progressEvent.loaded * 100) / progressEvent.total))
          } else if (file.size && file.size > 0) {
            // Fallback to file size if total is not available
            percentCompleted = Math.min(99, Math.round((progressEvent.loaded * 100) / file.size))
          } else if (progressEvent.loaded > 0) {
            // If we only have loaded bytes, provide a rough estimate (conservative)
            // Assume we're at least making progress
            percentCompleted = Math.min(50, Math.round(progressEvent.loaded / 100000)) // Rough estimate
          }
          
          onProgress(percentCompleted)
        }
      },
    })
    
    // Set progress to 100% on completion
    if (onProgress) {
      onProgress(100)
    }
    
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
      // Return null for 404 (no stats yet) instead of throwing
      if (error.response?.status === 404) {
        return null
      }
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



import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Use localhost for web, network IP for mobile
const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:8000/api/v1'
  }
  return process.env.EXPO_PUBLIC_API_URL || 'http://192.168.4.20:8000/api/v1'
}

const API_URL = getApiUrl()

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Matches API
export const matchesApi = {
  list: async (sortBy?: string, sortOrder?: string) => {
    const params: Record<string, string> = {}
    if (sortBy && sortBy.trim()) {
      params.sort_by = sortBy.trim()
    }
    if (sortOrder && sortOrder.trim()) {
      params.sort_order = sortOrder.trim()
    }
    const response = await api.get('/matches', { params })
    return response.data
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
  uploadVideo: async (matchId: number, uri: string) => {
    const formData = new FormData()
    formData.append('file', {
      uri,
      type: 'video/mp4',
      name: 'match-video.mp4',
    } as any)
    const response = await api.post(`/matches/${matchId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

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
  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
}

// Analytics API
export const analyticsApi = {
  getMatchStats: async (matchId: number) => {
    const response = await api.get(`/analytics/matches/${matchId}/stats`)
    return response.data
  },
  getHighlights: async (matchId: number) => {
    const response = await api.get(`/analytics/matches/${matchId}/highlights`)
    return response.data
  },
}




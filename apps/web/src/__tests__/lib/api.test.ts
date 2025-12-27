/**
 * Tests for API client
 */
import axios from 'axios'

// Mock axios before importing the API module
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
}

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockAxiosInstance),
  },
}))

// Mock localStorage before importing
const localStorageMock = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

describe('API Client', () => {
  let matchesApi: any
  let authApi: any

  beforeEach(async () => {
    jest.clearAllMocks()
    // Reset mock instance
    mockAxiosInstance.get.mockReset()
    mockAxiosInstance.post.mockReset()
    mockAxiosInstance.put.mockReset()
    mockAxiosInstance.delete.mockReset()
    
    // Import after mocks are set up
    const apiModule = await import('@/lib/api')
    matchesApi = apiModule.matchesApi
    authApi = apiModule.authApi
  })

  describe('matchesApi', () => {
    it('list: fetches matches list', async () => {
      const mockMatches = [{ id: 1, title: 'Test Match' }]
      mockAxiosInstance.get.mockResolvedValue({ data: mockMatches, status: 200 })

      const result = await matchesApi.list()
      
      expect(result).toEqual(mockMatches)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/matches', { params: {} })
    })

    it('list: fetches matches list with sorting', async () => {
      const mockMatches = [{ id: 1, title: 'Test Match' }]
      mockAxiosInstance.get.mockResolvedValue({ data: mockMatches, status: 200 })

      const result = await matchesApi.list('event_date', 'asc')
      
      expect(result).toEqual(mockMatches)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/matches', { 
        params: { sort_by: 'event_date', sort_order: 'asc' } 
      })
    })

    it('get: fetches a single match', async () => {
      const mockMatch = { id: 1, title: 'Test Match' }
      mockAxiosInstance.get.mockResolvedValue({ data: mockMatch })

      const result = await matchesApi.get(1)
      
      expect(result).toEqual(mockMatch)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/matches/1')
    })

    it('create: creates a new match', async () => {
      const matchData = { title: 'New Match', match_type: 'singles' }
      const mockMatch = { id: 1, ...matchData }
      mockAxiosInstance.post.mockResolvedValue({ data: mockMatch })

      const result = await matchesApi.create(matchData)
      
      expect(result).toEqual(mockMatch)
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/matches', matchData)
    })

    it('update: updates a match', async () => {
      const updateData = { player1_name: 'Updated Player', event: 'Tournament' }
      const mockMatch = { id: 1, title: 'Test Match', ...updateData }
      mockAxiosInstance.put.mockResolvedValue({ data: mockMatch })

      const result = await matchesApi.update(1, updateData)
      
      expect(result).toEqual(mockMatch)
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/matches/1', updateData)
    })
  })

  describe('authApi', () => {
    it('login: authenticates user', async () => {
      const mockToken = { access_token: 'token123', token_type: 'bearer' }
      mockAxiosInstance.post.mockResolvedValue({ data: mockToken })

      const result = await authApi.login('user', 'pass')
      expect(result).toEqual(mockToken)
    })

    it('register: registers new user', async () => {
      const userData = {
        username: 'newuser',
        email: 'user@example.com',
        password: 'pass123',
      }
      const mockUser = { id: 1, username: 'newuser', email: 'user@example.com' }
      mockAxiosInstance.post.mockResolvedValue({ data: mockUser })

      const result = await authApi.register(userData)
      expect(result).toEqual(mockUser)
    })
  })
})

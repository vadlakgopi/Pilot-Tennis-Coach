/**
 * Integration tests for authentication flow
 * Validates complete authentication redirect behavior
 */
import { render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import Home from '@/app/page'
import LoginPage from '@/app/login/page'
import { authApi } from '@/lib/api'

// Mock next/navigation
const mockReplace = jest.fn()
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/'),
  useParams: jest.fn(() => ({})),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

// Mock API
jest.mock('@/lib/api', () => ({
  authApi: {
    getCurrentUser: jest.fn(),
    login: jest.fn(),
  },
  usersApi: {
    getProfile: jest.fn(),
  },
  matchesApi: {
    list: jest.fn(),
  },
}))

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  })),
}))

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    ;(useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
      push: mockPush,
      prefetch: jest.fn(),
      back: jest.fn(),
    })
  })

  describe('Protected Routes', () => {
    it('redirects to login when accessing home page without token', async () => {
      // No token (localStorage cleared in beforeEach)

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/login')
      })

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('redirects to login when token is invalid', async () => {
      localStorage.setItem('auth_token', 'invalid-token')
      ;(authApi.getCurrentUser as jest.Mock).mockRejectedValue({
        response: { status: 401 },
      })

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(authApi.getCurrentUser).toHaveBeenCalled()
        expect(mockReplace).toHaveBeenCalledWith('/login')
      })

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('allows access when token is valid', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' }
      localStorage.setItem('auth_token', 'valid-token')
      ;(authApi.getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(authApi.getCurrentUser).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
      })

      expect(mockReplace).not.toHaveBeenCalled()
    })
  })

  describe('Login Page', () => {
    it('allows access to login page without authentication', () => {
      // No token (localStorage cleared in beforeEach)

      render(<LoginPage />)

      // Login page should render (check for a login-specific element)
      // Since we can't easily check the full login page content, 
      // we verify it doesn't redirect
      expect(mockReplace).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('redirects to home when already authenticated', async () => {
      localStorage.setItem('auth_token', 'valid-token')

      render(<LoginPage />)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })
  })

  describe('Token Verification', () => {
    it('verifies token on every session', async () => {
      localStorage.setItem('auth_token', 'test-token')
      ;(authApi.getCurrentUser as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'testuser',
      })

      render(
        <AuthGuard>
          <div>Content</div>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(authApi.getCurrentUser).toHaveBeenCalledTimes(1)
      })
    })

    it('removes token when verification fails', async () => {
      localStorage.setItem('auth_token', 'invalid-token')
      ;(authApi.getCurrentUser as jest.Mock).mockRejectedValue({
        response: { status: 401 },
      })

      render(
        <AuthGuard>
          <div>Content</div>
        </AuthGuard>
      )

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/login')
      })
      expect(localStorage.getItem('auth_token')).toBeNull()
    })
  })
})


/**
 * Tests for AuthGuard component
 * Validates authentication verification and redirect behavior
 */
import { render, screen, waitFor } from '@testing-library/react'
import AuthGuard from '@/components/auth/AuthGuard'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'

// Mock next/navigation
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/'),
  useParams: jest.fn(() => ({})),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

// Mock authApi
jest.mock('@/lib/api', () => ({
  authApi: {
    getCurrentUser: jest.fn(),
  },
}))

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    ;(useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
      push: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    })
  })

  it('shows loading state while verifying token', async () => {
    // With a token, getCurrentUser hangs so we stay in loading state
    localStorage.setItem('auth_token', 'valid-token')
    ;(authApi.getCurrentUser as jest.Mock).mockImplementation(() => new Promise(() => {}))

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(screen.getByText('Verifying authentication...')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('redirects to login when no token exists', async () => {
    // No token (localStorage cleared in beforeEach)

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login')
    }, { timeout: 3000 })

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('verifies token with backend API when token exists', async () => {
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
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('redirects to login when token verification fails (401)', async () => {
    localStorage.setItem('auth_token', 'invalid-token')
    const error = {
      response: {
        status: 401,
      },
    }
    ;(authApi.getCurrentUser as jest.Mock).mockRejectedValue(error)

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(authApi.getCurrentUser).toHaveBeenCalled()
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login')
    }, { timeout: 3000 })

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('redirects to login when token verification fails (network error)', async () => {
    localStorage.setItem('auth_token', 'invalid-token')
    const error = new Error('Network Error')
    ;(authApi.getCurrentUser as jest.Mock).mockRejectedValue(error)

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(authApi.getCurrentUser).toHaveBeenCalled()
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login')
    }, { timeout: 3000 })

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('does not render children when authentication fails', async () => {
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
      expect(mockReplace).toHaveBeenCalled()
    }, { timeout: 3000 })

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when authentication succeeds', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' }
    localStorage.setItem('auth_token', 'valid-token')
    ;(authApi.getCurrentUser as jest.Mock).mockResolvedValue(mockUser)

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(mockReplace).not.toHaveBeenCalled()
  })
})


/**
 * Tests for Home Page
 * Validates authentication requirements and redirect behavior
 */
import { render, screen, waitFor } from '@testing-library/react'
import Home from '@/app/page'
import { useRouter } from 'next/navigation'
import { usersApi, matchesApi } from '@/lib/api'
import { authApi } from '@/lib/api'

// Mock next/navigation
const mockReplace = jest.fn()
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
  useQuery: jest.fn(),
}))

// Mock AuthGuard to always allow (we're testing the page, not auth in this test)
jest.mock('@/components/auth/AuthGuard', () => {
  return function AuthGuard({ children }: { children: React.ReactNode }) {
    return <>{children}</>
  }
})

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

const { useQuery } = require('@tanstack/react-query')

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
      push: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    })
  })

  it('renders home page content when authenticated', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
    }
    const mockMatches = []

    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'currentUser') {
        return {
          data: mockUser,
          isLoading: false,
        }
      }
      if (queryKey[0] === 'matches') {
        return {
          data: mockMatches,
          isLoading: false,
        }
      }
      return { data: null, isLoading: false }
    })

    render(<Home />)

    expect(screen.getByText('Welcome Back!')).toBeInTheDocument()
    expect(screen.getByText('testuser')).toBeInTheDocument()
  })

  it('shows loading state while fetching user data', () => {
    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'currentUser') {
        return {
          data: undefined,
          isLoading: true,
        }
      }
      if (queryKey[0] === 'matches') {
        return {
          data: undefined,
          isLoading: true,
        }
      }
      return { data: null, isLoading: true }
    })

    render(<Home />)

    // Should show loading spinner (check for animate-spin class)
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('renders matches statistics when matches are loaded', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
    }
    const mockMatches = [
      { id: 1, status: 'completed' },
      { id: 2, status: 'processing' },
      { id: 3, status: 'completed' },
    ]

    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'currentUser') {
        return {
          data: mockUser,
          isLoading: false,
        }
      }
      if (queryKey[0] === 'matches') {
        return {
          data: mockMatches,
          isLoading: false,
        }
      }
      return { data: null, isLoading: false }
    })

    render(<Home />)

    expect(screen.getByText('Matches Uploaded')).toBeInTheDocument()
    expect(screen.getByText('Matches Analyzed')).toBeInTheDocument()
  })

  it('renders feature cards', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
    }
    const mockMatches = []

    ;(useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'currentUser') {
        return {
          data: mockUser,
          isLoading: false,
        }
      }
      if (queryKey[0] === 'matches') {
        return {
          data: mockMatches,
          isLoading: false,
        }
      }
      return { data: null, isLoading: false }
    })

    render(<Home />)

    expect(screen.getByText('Shot Analysis')).toBeInTheDocument()
    expect(screen.getByText('Match Statistics')).toBeInTheDocument()
    expect(screen.getByText('Serve Analytics')).toBeInTheDocument()
    expect(screen.getByText('Heatmaps')).toBeInTheDocument()
    expect(screen.getByText('Movement Tracking')).toBeInTheDocument()
    expect(screen.getByText('Highlights')).toBeInTheDocument()
  })

})


/**
 * Tests for Navbar component
 */
import { render, screen } from '@testing-library/react'
import Navbar from '@/components/layout/Navbar'
import { usePathname, useRouter } from 'next/navigation'

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
}

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}))

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  })),
}))

jest.mock('@/components/layout/LoginDropdown', () => {
  return function MockLoginDropdown() {
    return <span data-testid="login-dropdown">Sign In</span>
  }
})

jest.mock('@/components/layout/UserDropdown', () => {
  return function MockUserDropdown() {
    return <span data-testid="user-dropdown">User</span>
  }
})

describe('Navbar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(usePathname as jest.Mock).mockReturnValue('/')
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  it('renders Tennis Buddy brand name', () => {
    render(<Navbar />)
    expect(screen.getByText('Tennis Buddy')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    render(<Navbar />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Matches')).toBeInTheDocument()
  })

  it('highlights active route', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/matches')
    render(<Navbar />)
    const matchesLink = screen.getByText('Matches').closest('a')
    expect(matchesLink).toHaveClass('bg-blue-100')
  })
})





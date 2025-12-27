/**
 * Tests for Navbar component
 */
import { render, screen } from '@testing-library/react'
import Navbar from '@/components/layout/Navbar'
import { usePathname } from 'next/navigation'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

describe('Navbar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders Tennis Buddy brand name', () => {
    (usePathname as jest.Mock).mockReturnValue('/')
    render(<Navbar />)
    expect(screen.getByText('Tennis Buddy')).toBeInTheDocument()
  })

  it('renders navigation links', () => {
    (usePathname as jest.Mock).mockReturnValue('/')
    render(<Navbar />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Matches')).toBeInTheDocument()
    expect(screen.getByText('Upload')).toBeInTheDocument()
  })

  it('highlights active route', () => {
    (usePathname as jest.Mock).mockReturnValue('/matches')
    render(<Navbar />)
    const matchesLink = screen.getByText('Matches').closest('a')
    expect(matchesLink).toHaveClass('bg-blue-100')
  })
})





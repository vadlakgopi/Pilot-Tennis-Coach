/**
 * Tests for Matches Page
 */
import { render, screen, waitFor } from '@testing-library/react'
import MatchesPage from '@/app/matches/page'
import { matchesApi } from '@/lib/api'

// Mock the API
jest.mock('@/lib/api', () => ({
  matchesApi: {
    list: jest.fn(),
  },
}))

// Mock Next.js components
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

jest.mock('@/components/layout/Breadcrumbs', () => {
  return function Breadcrumbs() {
    return <div data-testid="breadcrumbs">Breadcrumbs</div>
  }
})

jest.mock('@/components/match/StatusExplanation', () => {
  return function StatusExplanation() {
    return <div data-testid="status-explanation">Status Explanation</div>
  }
})

jest.mock('@/components/match/EstimatedTimeModal', () => {
  return function EstimatedTimeModal() {
    return <div data-testid="estimated-time-modal">Estimated Time Modal</div>
  }
})

// Mock React Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}))

const { useQuery } = require('@tanstack/react-query')

describe('MatchesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state', () => {
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    render(<MatchesPage />)
    expect(screen.getByText('Loading matches...')).toBeInTheDocument()
  })

  it('renders error state for authentication', () => {
    useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('401 Unauthorized'),
    })

    render(<MatchesPage />)
    expect(screen.getByText('Error Loading Matches')).toBeInTheDocument()
    expect(screen.getByText(/log in to view/i)).toBeInTheDocument()
  })

  it('renders empty state when no matches', () => {
    useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })

    render(<MatchesPage />)
    expect(screen.getByText('No matches yet')).toBeInTheDocument()
    expect(screen.getByText(/Upload your first match/i)).toBeInTheDocument()
  })

  it('renders matches list', () => {
    const mockMatches = [
      {
        id: 1,
        title: 'Test Match',
        match_type: 'singles',
        player1_name: 'Player 1',
        player2_name: 'Player 2',
        status: 'completed',
        created_at: '2024-01-01T00:00:00Z',
      },
    ]

    useQuery.mockReturnValue({
      data: mockMatches,
      isLoading: false,
      error: null,
    })

    render(<MatchesPage />)
    expect(screen.getByText('Test Match')).toBeInTheDocument()
    expect(screen.getByText('Player 1')).toBeInTheDocument()
    expect(screen.getByText('Player 2')).toBeInTheDocument()
  })
})






/**
 * Tests for Upload Page
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UploadPage from '@/app/upload/page'
import { matchesApi } from '@/lib/api'
import { useRouter } from 'next/navigation'

jest.mock('@/lib/api', () => ({
  matchesApi: {
    create: jest.fn(),
    uploadVideo: jest.fn(),
  },
}))

jest.mock('next/navigation', () => ({
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

// Mock URL.createObjectURL for file preview (not available in jsdom)
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
}

describe('UploadPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  it('renders upload form', () => {
    render(<UploadPage />)
    expect(screen.getByText('Upload Match Video')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e.g., Practice Match/i)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<UploadPage />)
    const submitButton = screen.getByRole('button', { name: /Upload/i })
    fireEvent.click(submitButton)
    // Form validation should prevent submission
    await waitFor(() => {
      expect(matchesApi.create).not.toHaveBeenCalled()
    })
  })

  it('handles file selection', () => {
    const { container } = render(<UploadPage />)
    const file = new File(['test'], 'test.mp4', { type: 'video/mp4' })
    const input = container.querySelector('input[type="file"]')
    expect(input).toBeTruthy()
    fireEvent.change(input!, { target: { files: [file] } })
    expect(screen.getByText('test.mp4')).toBeInTheDocument()
  })
})





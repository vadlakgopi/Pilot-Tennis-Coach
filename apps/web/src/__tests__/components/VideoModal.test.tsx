/**
 * Tests for VideoModal component
 */
import { render, screen, fireEvent } from '@testing-library/react'
import VideoModal from '@/components/match/VideoModal'

// Mock HTMLMediaElement.play() for jsdom (not implemented)
beforeAll(() => {
  HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve())
})

describe('VideoModal', () => {
  const mockOnClose = jest.fn()
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    videoUrl: 'https://example.com/video.mp4',
    title: 'Test Video',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders when open', () => {
    render(<VideoModal {...defaultProps} />)
    expect(screen.getByText('Test Video')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<VideoModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Test Video')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(<VideoModal {...defaultProps} />)
    const closeButton = screen.getByLabelText('Close')
    fireEvent.click(closeButton)
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('renders video element with correct source', () => {
    const { container } = render(<VideoModal {...defaultProps} />)
    const video = container.querySelector('video')
    expect(video).toHaveAttribute('src', 'https://example.com/video.mp4')
  })
})





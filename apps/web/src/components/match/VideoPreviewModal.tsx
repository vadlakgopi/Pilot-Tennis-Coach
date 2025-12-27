'use client'

import { useEffect, useState, useRef } from 'react'

interface VideoPreviewModalProps {
  matchId: number
  isOpen: boolean
  onClose: () => void
}

export default function VideoPreviewModal({ matchId, isOpen, onClose }: VideoPreviewModalProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (isOpen && matchId) {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

      if (!token) {
        setError('Please log in to view videos')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      // Fetch video as blob to handle authentication properly
      // This is necessary because browsers' video elements can't send auth headers with Range requests
      const videoEndpoint = `${API_URL}/videos/matches/${matchId}/video`
      
      // Set a timeout to detect if video fails to load
      let timeoutId: NodeJS.Timeout | null = null
      timeoutId = setTimeout(() => {
        setError('Video is taking too long to load. Please check your connection and try again.')
        setLoading(false)
      }, 60000) // 60 second timeout

      // Fetch video with authentication header and create blob URL
      // Note: For large videos (312MB), this will download the entire file first
      fetch(videoEndpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            if (response.status === 401) {
              throw new Error('Authentication failed. Please log in again.')
            }
            if (response.status === 404) {
              throw new Error('Video not found for this match.')
            }
            throw new Error(`Failed to load video: ${response.statusText} (${response.status})`)
          }
          
          const contentLength = response.headers.get('content-length')
          const total = contentLength ? parseInt(contentLength, 10) : 0
          
          if (!response.body) {
            throw new Error('Response body is null')
          }
          
          const reader = response.body.getReader()
          const chunks: Uint8Array[] = []
          let receivedLength = 0
          
          // Read the stream in chunks to show progress
          function pump(): Promise<void> {
            return reader.read().then(({ done, value }) => {
              if (done) {
                return Promise.resolve()
              }
              
              if (value) {
                chunks.push(value)
                receivedLength += value.length
                
                // Update loading message with progress
                if (total > 0) {
                  const percent = Math.round((receivedLength / total) * 100)
                  setDownloadProgress(percent)
                  console.log(`Downloading video: ${percent}%`)
                }
              }
              
              return pump()
            })
          }
          
          return pump().then(() => {
            // Combine all chunks into a single blob
            const blob = new Blob(chunks, { type: 'video/mp4' })
            return blob
          })
        })
        .then((blob) => {
          // Create object URL from blob for video playback
          const url = URL.createObjectURL(blob)
          setVideoUrl(url)
          setLoading(false)
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
        })
        .catch((err) => {
          console.error('Video loading error:', err)
          setError(err.message || 'Failed to load video. Please check your connection and authentication.')
          setLoading(false)
          if (timeoutId) {
            clearTimeout(timeoutId)
          }
        })

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        if (videoUrl && videoUrl.startsWith('blob:')) {
          URL.revokeObjectURL(videoUrl)
        }
      }
    } else {
      // Cleanup blob URL when closing
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl)
      }
      setVideoUrl(null)
      setError(null)
      setLoading(false)
    }
  }, [isOpen, matchId])

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-black rounded-lg shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-cyan-600">
          <h2 className="text-xl font-bold text-white">Video Preview</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/10 rounded-lg"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video Player */}
        <div className="relative bg-black flex items-center justify-center min-h-[400px]">
          {loading ? (
            <div className="text-white text-center py-16">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
              <p className="text-lg mb-4">Loading video{downloadProgress > 0 ? ` (${downloadProgress}%)` : '...'}</p>
              {downloadProgress > 0 && (
                <div className="w-64 mx-auto bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : error ? (
            <div className="text-white text-center p-8">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-lg mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          ) : videoUrl ? (
            <video
              ref={videoRef}
              key={videoUrl} // Force re-render when URL changes
              src={videoUrl}
              controls
              autoPlay
              preload="metadata"
              className="w-full max-h-[70vh]"
              onError={(e) => {
                console.error('Video playback error:', e)
                const video = e.target as HTMLVideoElement
                const error = video?.error
                const errorCode = error?.code
                const errorMessage_detail = error?.message || ''
                
                console.error('Video error details:', {
                  code: errorCode,
                  message: errorMessage_detail,
                  networkState: video?.networkState,
                  readyState: video?.readyState,
                  src: video?.src,
                  currentSrc: video?.currentSrc,
                })
                
                let errorMessage = 'Failed to play video.'
                
                if (errorCode === 1) {
                  errorMessage = 'Video loading was aborted. Please try again.'
                } else if (errorCode === 2) {
                  errorMessage = `Network error while loading video. This may be a CORS or authentication issue. ${errorMessage_detail}`
                } else if (errorCode === 3) {
                  errorMessage = 'Video decoding error. The file may be corrupted or in an unsupported format.'
                } else if (errorCode === 4) {
                  errorMessage = 'Video format not supported by your browser. Try using Chrome or Firefox.'
                }
                
                setError(errorMessage)
                setLoading(false)
              }}
              onLoadStart={() => {
                console.log('Video load started', videoUrl)
                setLoading(true)
              }}
              onLoadedMetadata={() => {
                console.log('Video metadata loaded successfully')
                setLoading(false)
              }}
              onCanPlay={() => {
                console.log('Video can play')
                setLoading(false)
              }}
              onCanPlayThrough={() => {
                console.log('Video can play through')
                setLoading(false)
              }}
              onLoadedData={() => {
                console.log('Video data loaded')
                setLoading(false)
              }}
              onWaiting={() => {
                console.log('Video waiting for data')
                setLoading(true)
              }}
              onStalled={() => {
                console.log('Video stalled')
                setLoading(true)
              }}
              onProgress={() => {
                // Video is making progress, hide loading
                setLoading(false)
              }}
            >
              Your browser does not support video playback.
            </video>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-900 text-gray-400 text-sm text-center border-t border-gray-800">
          Press ESC or click outside to close
        </div>
      </div>
    </div>
  )
}

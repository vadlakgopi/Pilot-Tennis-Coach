'use client'

import { useState, useEffect } from 'react'

interface EstimatedTimeModalProps {
  status: string
  createdAt?: string | Date
  isOpen: boolean
  onClose: () => void
}

export default function EstimatedTimeModal({
  status,
  createdAt,
  isOpen,
  onClose,
}: EstimatedTimeModalProps) {
  const [timeElapsed, setTimeElapsed] = useState<string>('')
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string>('')

  useEffect(() => {
    if (!isOpen || !createdAt) return

    const updateTimes = () => {
      const now = new Date()
      const created = new Date(createdAt)
      const elapsedMs = now.getTime() - created.getTime()
      const elapsedMins = Math.floor(elapsedMs / 60000)
      
      // Format elapsed time
      if (elapsedMins < 1) {
        setTimeElapsed('Just now')
      } else if (elapsedMins < 60) {
        setTimeElapsed(`${elapsedMins} minute${elapsedMins > 1 ? 's' : ''}`)
      } else {
        const hours = Math.floor(elapsedMins / 60)
        const mins = elapsedMins % 60
        setTimeElapsed(`${hours}h ${mins}m`)
      }

      // Estimated time remaining based on status
      let estimatedMins = 0
      if (status.toLowerCase() === 'uploading') {
        estimatedMins = Math.max(0, 5 - elapsedMins) // 5 minutes for upload
        setEstimatedTimeRemaining(estimatedMins > 0 ? `~${estimatedMins} minute${estimatedMins > 1 ? 's' : ''}` : 'Any moment now')
      } else if (status.toLowerCase() === 'analyzing') {
        estimatedMins = Math.max(0, 30 - elapsedMins) // 30 minutes for analysis
        if (estimatedMins > 60) {
          const hours = Math.floor(estimatedMins / 60)
          setEstimatedTimeRemaining(`~${hours} hour${hours > 1 ? 's' : ''}`)
        } else if (estimatedMins > 0) {
          setEstimatedTimeRemaining(`~${estimatedMins} minute${estimatedMins > 1 ? 's' : ''}`)
        } else {
          setEstimatedTimeRemaining('Any moment now')
        }
      } else {
        setEstimatedTimeRemaining('Complete')
      }
    }

    updateTimes()
    const interval = setInterval(updateTimes, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [isOpen, createdAt, status])

  if (!isOpen) return null

  const statusInfo = {
    uploading: {
      title: 'Uploading Video',
      icon: '📤',
      description: 'Your video is being uploaded to our servers',
      estimatedDuration: '2-5 minutes',
      color: 'purple',
    },
    analyzing: {
      title: 'Analyzing Match',
      icon: '🔍',
      description: 'AI is processing your video to extract match statistics',
      estimatedDuration: '20-30 minutes',
      color: 'blue',
    },
    completed: {
      title: 'Analysis Complete',
      icon: '✅',
      description: 'Your match analytics are ready to view',
      estimatedDuration: 'Complete',
      color: 'green',
    },
  }

  const currentStatus = statusInfo[status.toLowerCase() as keyof typeof statusInfo] || statusInfo.uploading

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`p-6 text-white ${
            currentStatus.color === 'purple' 
              ? 'bg-gradient-to-r from-purple-500 to-purple-600'
              : currentStatus.color === 'blue'
              ? 'bg-gradient-to-r from-blue-500 to-blue-600'
              : 'bg-gradient-to-r from-green-500 to-green-600'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{currentStatus.icon}</span>
                <div>
                  <h2 className="text-2xl font-bold">{currentStatus.title}</h2>
                  <p className="text-sm text-white/90 mt-1">{currentStatus.description}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Time Estimates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Time Elapsed</p>
                <p className="text-2xl font-bold text-gray-900">{timeElapsed || 'Calculating...'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Est. Remaining</p>
                <p className="text-2xl font-bold text-gray-900">{estimatedTimeRemaining || 'Calculating...'}</p>
              </div>
            </div>

            {/* Typical Duration */}
            <div className={`rounded-lg p-4 border ${
              currentStatus.color === 'purple'
                ? 'bg-purple-50 border-purple-200'
                : currentStatus.color === 'blue'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <p className="text-sm font-semibold text-gray-900 mb-1">Typical Duration</p>
              <p className={`text-lg font-bold ${
                currentStatus.color === 'purple'
                  ? 'text-purple-700'
                  : currentStatus.color === 'blue'
                  ? 'text-blue-700'
                  : 'text-green-700'
              }`}>
                {currentStatus.estimatedDuration}
              </p>
              <p className="text-xs text-gray-600 mt-2">
                {status.toLowerCase() === 'uploading' && 'Upload time depends on video file size and your internet connection'}
                {status.toLowerCase() === 'analyzing' && 'Analysis time depends on video length and complexity of the match'}
                {status.toLowerCase() === 'completed' && 'Your match has been fully processed and is ready to view'}
              </p>
            </div>

            {/* Progress Indicator */}
            {status.toLowerCase() !== 'completed' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Processing...</span>
                  <span className="text-gray-500">This may take a while</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 animate-pulse ${
                      currentStatus.color === 'purple'
                        ? 'bg-purple-500'
                        : currentStatus.color === 'blue'
                        ? 'bg-blue-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: '60%' }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  You'll be notified when the analysis is complete
                </p>
              </div>
            )}

            {/* Status Info */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600">
                <strong>What's happening?</strong>
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                {status.toLowerCase() === 'uploading' && (
                  <>
                    <li>Your video file is being securely uploaded</li>
                    <li>We're verifying the video format and quality</li>
                    <li>Once complete, analysis will begin automatically</li>
                  </>
                )}
                {status.toLowerCase() === 'analyzing' && (
                  <>
                    <li>Our AI is detecting players and tracking movement</li>
                    <li>Shot classification and rally detection in progress</li>
                    <li>Statistical analysis is being generated</li>
                    <li>Heatmaps and insights are being created</li>
                  </>
                )}
                {status.toLowerCase() === 'completed' && (
                  <>
                    <li>All analysis is complete</li>
                    <li>Match statistics are available</li>
                    <li>You can now view detailed insights and analytics</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  )
}


'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { matchesApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import Breadcrumbs from '@/components/layout/Breadcrumbs'

type UploadStage = 'idle' | 'creating' | 'uploading' | 'completed' | 'error'

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [matchTitle, setMatchTitle] = useState('')
  const [player1Name, setPlayer1Name] = useState('')
  const [player2Name, setPlayer2Name] = useState('')
  const [event, setEvent] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [bracket, setBracket] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [failedMatchId, setFailedMatchId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const createMatch = useMutation({
    mutationFn: (data: any) => matchesApi.create(data),
    onSuccess: (match) => {
      if (file) {
        setFailedMatchId(match.id)
        setUploadStage('uploading')
        setUploadProgress(0)
        uploadVideo.mutate({ matchId: match.id, file })
      } else {
        router.push('/matches')
      }
    },
    onError: (error: any) => {
      setUploadStage('error')
      setError(error.response?.data?.detail || 'Failed to create match. Please try again.')
    },
  })

  const uploadVideo = useMutation({
    mutationFn: ({ matchId, file }: { matchId: number; file: File }) =>
      matchesApi.uploadVideo(matchId, file, (progress) => {
        setUploadProgress(progress)
      }),
    onSuccess: () => {
      setUploadStage('completed')
      setUploadProgress(100)
      // Redirect after a short delay to show completion
      setTimeout(() => {
        router.push('/matches')
      }, 1500)
    },
    onError: (error: any) => {
      setUploadStage('error')
      setError(error.response?.data?.detail || 'Failed to upload video. Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setUploadStage('creating')
    if (!matchTitle || !file) return

    createMatch.mutate({
      title: matchTitle,
      match_type: 'singles',
      player1_name: player1Name || undefined,
      player2_name: player2Name || undefined,
      event: event || undefined,
      event_date: eventDate ? new Date(eventDate).toISOString() : undefined,
      bracket: bracket || undefined,
    })
  }

  const handleRetry = () => {
    setError(null)
    if (failedMatchId && file) {
      setUploadStage('uploading')
      setUploadProgress(0)
      uploadVideo.mutate({ matchId: failedMatchId, file })
    } else if (file) {
      // Retry from beginning
      setUploadStage('creating')
      createMatch.mutate({
        title: matchTitle,
        match_type: 'singles',
        player1_name: player1Name || undefined,
        player2_name: player2Name || undefined,
      })
    }
  }

  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile) {
      // Validate file type
      const validTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime', 'video/x-msvideo']
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase()
      const validExtensions = ['mp4', 'mov', 'avi', 'mkv']
      
      if (!validTypes.includes(selectedFile.type) && !validExtensions.includes(fileExtension || '')) {
        setError('Invalid file type. Please select a video file (MP4, MOV, AVI, MKV).')
        return
      }

      setFile(selectedFile)
      setError(null)
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(selectedFile)
      setVideoPreview(previewUrl)
    } else {
      setFile(null)
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview)
        setVideoPreview(null)
      }
    }
  }

  const handleReselect = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview)
      setVideoPreview(null)
    }
    setFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Upload Match' }]} />
      
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black text-gray-900 mb-2 flex items-center justify-center gap-2">
          <span className="text-3xl">📤</span>
          Upload Match Video
        </h1>
        <p className="text-sm text-gray-600">
          Upload your tennis match video for instant AI-powered analytics
        </p>
      </div>

      <div className="bg-gradient-to-br from-white to-green-50 rounded-xl shadow-xl border-2 border-green-200 p-6">
        {/* Error Display with Retry */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <span className="text-2xl mr-3">⚠️</span>
                <div className="flex-1">
                  <p className="text-red-900 font-semibold">Upload Failed</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                  {uploadStage === 'error' && (
                    <p className="text-red-600 text-xs mt-2">
                      Don't worry - your match has been created and you can retry the upload.
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleRetry}
                className="ml-4 bg-red-600 hover:bg-red-700 text-white"
                size="sm"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {(uploadStage === 'creating' || uploadStage === 'uploading') && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-900 font-semibold">
                {uploadStage === 'creating' ? 'Creating match...' : 'Uploading video...'}
              </span>
              <span className="text-blue-700 font-semibold">
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            {uploadStage === 'uploading' && (
              <p className="text-blue-700 text-xs mt-2">
                Please keep this page open until upload completes...
              </p>
            )}
          </div>
        )}

        {/* Success Message */}
        {uploadStage === 'completed' && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">✅</span>
              <div>
                <p className="text-green-900 font-semibold">Upload Successful!</p>
                <p className="text-green-700 text-sm">Redirecting to matches...</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Match Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Match Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={matchTitle}
              onChange={(e) => setMatchTitle(e.target.value)}
              placeholder="e.g., Practice Match - Jan 15"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              required
              disabled={uploadStage === 'creating' || uploadStage === 'uploading'}
            />
          </div>

          {/* Player Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Player 1 Name
              </label>
              <input
                type="text"
                value={player1Name}
                onChange={(e) => setPlayer1Name(e.target.value)}
                placeholder="Player 1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={uploadStage === 'creating' || uploadStage === 'uploading'}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Player 2 Name
              </label>
              <input
                type="text"
                value={player2Name}
                onChange={(e) => setPlayer2Name(e.target.value)}
                placeholder="Player 2"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={uploadStage === 'creating' || uploadStage === 'uploading'}
              />
            </div>
          </div>

          {/* Event Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Event
              </label>
              <input
                type="text"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder="Tournament Name / Practice"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={uploadStage === 'creating' || uploadStage === 'uploading'}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Event Date
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={uploadStage === 'creating' || uploadStage === 'uploading'}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bracket
              </label>
              <input
                type="text"
                value={bracket}
                onChange={(e) => setBracket(e.target.value)}
                placeholder="Round Robin, Quarter Final, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={uploadStage === 'creating' || uploadStage === 'uploading'}
              />
            </div>
          </div>

          {/* Video Upload Section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Video File <span className="text-red-500">*</span>
            </label>
            
            {!file ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
                }`}
              >
                <div className="space-y-4">
                  <div className="text-5xl">📹</div>
                  <div>
                    <p className="text-gray-700 font-medium mb-1">
                      Drag and drop your video here
                    </p>
                    <p className="text-sm text-gray-500">or</p>
                    <label className="inline-block mt-2">
                      <span className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                        Browse Files
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                        className="hidden"
                        required
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Supported formats: MP4, MOV, AVI, MKV
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Video Preview */}
                {videoPreview && (
                  <div className="border border-gray-300 rounded-lg overflow-hidden bg-black">
                    <video
                      ref={videoRef}
                      src={videoPreview}
                      controls
                      className="w-full max-h-96"
                      preload="metadata"
                    >
                      Your browser does not support video preview.
                    </video>
                  </div>
                )}

                {/* File Info */}
                <div className="border-2 border-green-500 bg-green-50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">✅</span>
                        <p className="font-semibold text-gray-900">{file.name}</p>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1 ml-8">
                        <p>Size: {formatFileSize(file.size)}</p>
                        <p>Type: {file.type || 'video'}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleReselect}
                      variant="outline"
                      size="sm"
                      className="ml-4"
                      disabled={uploadStage === 'creating' || uploadStage === 'uploading'}
                    >
                      Change Video
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              size="lg"
              disabled={
                createMatch.isPending ||
                uploadVideo.isPending ||
                !matchTitle ||
                !file ||
                uploadStage === 'completed'
              }
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all text-lg py-6"
            >
              {uploadStage === 'creating' || uploadStage === 'uploading' ? (
                <span className="flex items-center justify-center">
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                  {uploadStage === 'creating' ? 'Creating Match...' : `Uploading... ${uploadProgress}%`}
                </span>
              ) : uploadStage === 'completed' ? (
                <>
                  <span className="mr-2">✅</span>
                  Upload Complete!
                </>
              ) : (
                <>
                  <span className="mr-2">🚀</span>
                  Upload & Analyze Match
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
          <span className="mr-2">ℹ️</span>
          What happens next?
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Your video will be uploaded and queued for processing</li>
          <li>AI will analyze shots, serves, and rallies</li>
          <li>You'll receive detailed analytics and insights</li>
          <li>Processing typically takes 2-5 minutes after upload completes</li>
        </ul>
      </div>
    </div>
  )
}

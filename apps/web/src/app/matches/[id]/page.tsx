'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { matchesApi, analyticsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import StatusExplanation from '@/components/match/StatusExplanation'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
import AuthGuard from '@/components/auth/AuthGuard'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export default function MatchDetailPage() {
  return (
    <AuthGuard>
      <MatchDetailContent />
    </AuthGuard>
  )
}

function MatchDetailContent() {
  const params = useParams()
  const rawId = params?.id
  const idStr = Array.isArray(rawId) ? rawId[0] : rawId
  const matchId = idStr != null && String(idStr).trim() !== '' ? Number(idStr) : NaN
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    player1_name: '',
    player2_name: '',
    event: '',
    event_date: '',
    bracket: '',
    uploader_notes: ''
  })

  const { data: match, isLoading, error } = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => matchesApi.get(matchId),
    enabled: !Number.isNaN(matchId),
  })

  const { data: stats, error: statsError } = useQuery({
    queryKey: ['matchStats', matchId],
    queryFn: () => analyticsApi.getMatchStats(matchId),
    enabled: !Number.isNaN(matchId),
    retry: false, // Don't retry on 404
    throwOnError: false, // Don't throw errors, handle them gracefully
  })

  const updateMatch = useMutation({
    mutationFn: (data: any) => matchesApi.update(matchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', matchId] })
      setIsEditing(false)
    },
  })

  // Initialize edit data when match loads
  useEffect(() => {
    if (match && !isEditing) {
      setEditData({
        player1_name: match.player1_name || '',
        player2_name: match.player2_name || '',
        event: match.event || '',
        event_date: match.event_date ? new Date(match.event_date).toISOString().split('T')[0] : '',
        bracket: match.bracket || '',
        uploader_notes: match.uploader_notes || ''
      })
    }
  }, [match, isEditing])

  const handleSave = () => {
    updateMatch.mutate({
      player1_name: editData.player1_name || null,
      player2_name: editData.player2_name || null,
      event: editData.event || null,
      event_date: editData.event_date ? new Date(editData.event_date).toISOString() : null,
      bracket: editData.bracket || null,
      uploader_notes: editData.uploader_notes || null,
    })
  }

  const getStatusBadge = (status: string) => {
    const key = (status || '').toLowerCase()
    const styles = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      processing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      analyzing: 'bg-blue-100 text-blue-800 border-blue-200',
      uploading: 'bg-purple-100 text-purple-800 border-purple-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
    }
    return styles[key as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusLabel = (status: string) => {
    const key = (status || '').toLowerCase()
    const labels: Record<string, string> = {
      completed: 'Ready',
      analyzing: 'Analyzing',
      uploading: 'Uploading',
      processing: 'Processing',
      failed: 'Failed',
    }
    if (!key) return 'Unknown'
    return labels[key] || status.charAt(0).toUpperCase() + status.slice(1)
  }

  if (Number.isNaN(matchId)) {
    return (
        <div className="container mx-auto px-4 py-4 h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">Invalid Match ID</h2>
            <Link href="/matches">
              <Button variant="outline" className="mt-4">Back to Matches</Button>
            </Link>
          </div>
        </div>
    )
  }

  if (isLoading) {
    return (
        <div className="container mx-auto px-4 py-4 h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-gray-600">Loading match details...</p>
          </div>
        </div>
    )
  }

  if (error || !match) {
    return (
        <div className="container mx-auto px-4 py-4 h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">Match Not Found</h2>
            <p className="text-red-700 mb-4">The match you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</p>
            <Link href="/matches">
              <Button variant="outline">Back to Matches</Button>
            </Link>
          </div>
        </div>
    )
  }

  return (
    <>
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-6 py-6">
          <div className="flex-shrink-0 mb-4">
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Matches', href: '/matches' },
                { label: match.title || 'Match Details' },
              ]}
            />
          </div>
          
          <div className="space-y-6">
            {/* Header with Match Title and Details */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <Link href="/matches" className="text-white/80 hover:text-white transition-colors mt-1">
                    <span className="text-xl">←</span>
                  </Link>
                  <div className="flex-1">
                    <h1 className="text-3xl font-black flex items-center gap-2 mb-3">
                      <span className="text-3xl">🎾</span>
                      {match.title}
                    </h1>
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-bold">
                        {match.match_type?.toUpperCase() || 'SINGLES'}
                      </span>
                      {match.court_surface && (
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
                          {match.court_surface.toUpperCase()}
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        match.status === 'completed' 
                          ? 'bg-green-500 text-white' 
                          : match.status === 'analyzing' || match.status === 'processing'
                          ? 'bg-yellow-500 text-white'
                          : match.status === 'failed'
                          ? 'bg-red-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {getStatusLabel(match.status || '')}
                      </span>
                      <div className="text-white/90">
                        <StatusExplanation />
                      </div>
                    </div>
                    {/* Details Section in Header */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                      {match.event && (
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                          <div className="text-xs text-white/80 mb-1">Event</div>
                          <div className="text-sm font-bold text-white">{match.event}</div>
                        </div>
                      )}
                      {match.event_date && (
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                          <div className="text-xs text-white/80 mb-1">Date</div>
                          <div className="text-sm font-bold text-white">
                            {new Date(match.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      )}
                      {match.bracket && (
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                          <div className="text-xs text-white/80 mb-1">Bracket</div>
                          <div className="text-sm font-bold text-white">{match.bracket}</div>
                        </div>
                      )}
                      {match.duration_minutes && (
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                          <div className="text-xs text-white/80 mb-1">Duration</div>
                          <div className="text-sm font-bold text-white">{Math.round(match.duration_minutes)} min</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {match.processing_progress > 0 && match.processing_progress < 1 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/90 font-semibold">Processing</span>
                    <span className="text-base font-bold">{Math.round(match.processing_progress * 100)}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className="bg-white h-2 rounded-full transition-all"
                      style={{ width: `${match.processing_progress * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Heatmap with Player Stats */}
            <div className="relative w-full aspect-[3/2] max-h-[500px] rounded-2xl overflow-hidden shadow-xl bg-gray-100">
              {/* Background Image */}
              <div className="absolute inset-0">
                <Image
                  src="/images/tennis_court_heatmap.png"
                  alt="Tennis court with heatmap analytics"
                  fill
                  className="object-contain"
                  priority
                  quality={90}
                  sizes="100vw"
                />
              </div>
              
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/30"></div>

              {/* Player Stats on Opposite Courts */}
              <div className="relative z-10 h-full flex items-center justify-center p-4">
                {/* Video Buttons - Top Center */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-3 z-20">
                  {/* Highlights Video */}
                  {(() => {
                    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
                    const highlightsUrl = token
                      ? `${API_URL}/videos/matches/${matchId}/highlights-video?token=${token}`
                      : null
                    return highlightsUrl ? (
                      <button
                        onClick={() => window.open(highlightsUrl, '_blank')}
                        className="bg-white/95 backdrop-blur-md rounded-lg border-2 border-blue-500 shadow-xl px-4 py-2 hover:bg-white transition-all flex items-center gap-2"
                      >
                        <span className="text-lg">🎬</span>
                        <span className="font-bold text-xs text-gray-900">Highlights</span>
                      </button>
                    ) : null
                  })()}

                  {/* Full Match Video */}
                  {match.videos && match.videos.length > 0 && (() => {
                    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
                    const fullVideoUrl = token
                      ? `${API_URL}/videos/matches/${matchId}/video?token=${token}`
                      : null
                    return fullVideoUrl ? (
                      <button
                        onClick={() => window.open(fullVideoUrl, '_blank')}
                        className="bg-white/95 backdrop-blur-md rounded-lg border-2 border-green-500 shadow-xl px-4 py-2 hover:bg-white transition-all flex items-center gap-2"
                      >
                        <span className="text-lg">🎾</span>
                        <span className="font-bold text-xs text-gray-900">Full Match</span>
                      </button>
                    ) : null
                  })()}
                </div>

                {/* Player 1 - Left Side */}
                <div className="absolute left-4 bg-white/95 backdrop-blur-md rounded-xl p-3 border-2 border-blue-500 shadow-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">👤</span>
                    <span className="font-bold text-xs text-gray-900">
                      {match.player1_name || 'Player 1'}
                    </span>
                  </div>
                  
                  {stats?.player1_stats ? (
                    <>
                      {/* Points */}
                      <div className="mb-2">
                        <div className="font-bold text-[10px] text-gray-900 mb-0.5">Points</div>
                        <div className="text-base font-black text-blue-600">
                          {stats.player1_stats.points_won}/{stats.player1_stats.total_points}
                        </div>
                      </div>

                      {/* Performance */}
                      <div>
                        <div className="font-bold text-[10px] text-gray-900 mb-1 flex items-center gap-1">
                          <span>🎯</span>
                          <span>Performance</span>
                        </div>
                        <div className="space-y-0.5 text-[10px] text-gray-700">
                          <div>Winners: <span className="font-semibold text-blue-600">{stats.player1_stats.winners}</span></div>
                          <div>Errors: <span className="font-semibold text-red-600">{stats.player1_stats.errors}</span></div>
                          <div>Coverage: <span className="font-semibold text-blue-600">{stats.player1_stats.court_coverage?.toFixed(0) || '0'}%</span></div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-gray-500">Stats loading...</div>
                  )}
                </div>

                {/* Player 2 - Right Side */}
                <div className="absolute right-4 bg-white/95 backdrop-blur-md rounded-xl p-3 border-2 border-green-500 shadow-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">👤</span>
                    <span className="font-bold text-xs text-gray-900">
                      {match.player2_name || 'Player 2'}
                    </span>
                  </div>
                  
                  {stats?.player2_stats ? (
                    <>
                      {/* Points */}
                      <div className="mb-2">
                        <div className="font-bold text-[10px] text-gray-900 mb-0.5">Points</div>
                        <div className="text-base font-black text-green-600">
                          {stats.player2_stats.points_won}/{stats.player2_stats.total_points}
                        </div>
                      </div>

                      {/* Performance */}
                      <div>
                        <div className="font-bold text-[10px] text-gray-900 mb-1 flex items-center gap-1">
                          <span>🎯</span>
                          <span>Performance</span>
                        </div>
                        <div className="space-y-0.5 text-[10px] text-gray-700">
                          <div>Winners: <span className="font-semibold text-green-600">{stats.player2_stats.winners}</span></div>
                          <div>Errors: <span className="font-semibold text-red-600">{stats.player2_stats.errors}</span></div>
                          <div>Coverage: <span className="font-semibold text-green-600">{stats.player2_stats.court_coverage?.toFixed(0) || '0'}%</span></div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-gray-500">Stats loading...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  )
}


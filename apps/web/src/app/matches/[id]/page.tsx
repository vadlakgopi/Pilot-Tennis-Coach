'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { matchesApi, analyticsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import StatusExplanation from '@/components/match/StatusExplanation'
import VideoModal from '@/components/match/VideoModal'
import Breadcrumbs from '@/components/layout/Breadcrumbs'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

export default function MatchDetailPage() {
  const params = useParams()
  const matchId = Number(params?.id)
  const queryClient = useQueryClient()
  const [videoModal, setVideoModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  })
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
    const styles = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      processing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      analyzing: 'bg-blue-100 text-blue-800 border-blue-200',
      uploading: 'bg-purple-100 text-purple-800 border-purple-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
    }
    return styles[status.toLowerCase() as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'Ready',
      analyzing: 'Analyzing',
      uploading: 'Uploading',
      processing: 'Processing',
      failed: 'Failed',
    }
    return labels[status.toLowerCase()] || status.charAt(0).toUpperCase() + status.slice(1)
  }

  if (Number.isNaN(matchId)) {
    return (
      <div className="container mx-auto px-4 py-16">
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
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-gray-600">Loading match details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">Match Not Found</h2>
          <p className="text-red-700 mb-4">The match you're looking for doesn't exist or you don't have permission to view it.</p>
          <Link href="/matches">
            <Button variant="outline">Back to Matches</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 space-y-3">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Matches', href: '/matches' },
          { label: match.title || 'Match Details' },
        ]}
      />
      
      {/* Header - Green Tennis Theme */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/matches" className="text-white/80 hover:text-white transition-colors">
              <span className="text-xl">←</span>
            </Link>
            <div>
              <h1 className="text-2xl font-black flex items-center gap-2">
                <span className="text-2xl">🎾</span>
                {match.title}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-bold">
                  {match.match_type?.toUpperCase() || 'SINGLES'}
                </span>
                {match.court_surface && (
                  <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-semibold">
                    {match.court_surface.toUpperCase()}
                  </span>
                )}
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  match.status === 'completed' 
                    ? 'bg-green-500 text-white' 
                    : match.status === 'analyzing' || match.status === 'processing'
                    ? 'bg-yellow-500 text-white'
                    : match.status === 'failed'
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}>
                  {getStatusLabel(match.status)}
                </span>
                <div className="text-white/80">
                  <StatusExplanation />
                </div>
              </div>
            </div>
          </div>
        </div>
        {match.processing_progress > 0 && match.processing_progress < 1 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/90">Processing</span>
              <span className="text-sm font-bold">{Math.round(match.processing_progress * 100)}%</span>
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

      {/* Match Summary - Combined Players and Details - Editable */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <span className="text-xl">📋</span>
            Match Summary
          </h2>
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs"
            >
              ✏️ Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false)
                  // Reset to original values
                  if (match) {
                    setEditData({
                      player1_name: match.player1_name || '',
                      player2_name: match.player2_name || '',
                      event: match.event || '',
                      event_date: match.event_date ? new Date(match.event_date).toISOString().split('T')[0] : '',
                      bracket: match.bracket || '',
                      uploader_notes: match.uploader_notes || ''
                    })
                  }
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMatch.isPending}
                className="text-xs bg-green-600 hover:bg-green-700"
              >
                {updateMatch.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Players Section */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
              <span>👥</span> Players
            </h3>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editData.player1_name}
                  onChange={(e) => setEditData({ ...editData, player1_name: e.target.value })}
                  placeholder="Player 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <p className="text-gray-500 text-xs text-center">VS</p>
                <input
                  type="text"
                  value={editData.player2_name}
                  onChange={(e) => setEditData({ ...editData, player2_name: e.target.value })}
                  placeholder="Player 2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm">
                  <p className="font-bold text-gray-900">{match.player1_name || 'Player 1'}</p>
                  <p className="text-gray-500 text-xs my-1">VS</p>
                  <p className="font-bold text-gray-900">{match.player2_name || 'Player 2'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
              <span>📅</span> Details
            </h3>
            {isEditing ? (
              <div className="space-y-2 text-sm">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Event</label>
                  <input
                    type="text"
                    value={editData.event}
                    onChange={(e) => setEditData({ ...editData, event: e.target.value })}
                    placeholder="Tournament Name / Practice"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Event Date</label>
                  <input
                    type="date"
                    value={editData.event_date}
                    onChange={(e) => setEditData({ ...editData, event_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Bracket</label>
                  <input
                    type="text"
                    value={editData.bracket}
                    onChange={(e) => setEditData({ ...editData, bracket: e.target.value })}
                    placeholder="Round Robin, Quarter Final, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Uploader Notes</label>
                  <textarea
                    value={editData.uploader_notes}
                    onChange={(e) => setEditData({ ...editData, uploader_notes: e.target.value })}
                    placeholder="Add notes..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                {match.event && (
                  <div>
                    <span className="text-gray-600">Event: </span>
                    <span className="font-semibold text-gray-900">{match.event}</span>
                  </div>
                )}
                {match.event_date && (
                  <div>
                    <span className="text-gray-600">Event Date: </span>
                    <span className="font-semibold text-gray-900">
                      {new Date(match.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {match.bracket && (
                  <div>
                    <span className="text-gray-600">Bracket: </span>
                    <span className="font-semibold text-gray-900">{match.bracket}</span>
                  </div>
                )}
                {match.match_date && (
                  <div>
                    <span className="text-gray-600">Date: </span>
                    <span className="font-semibold text-gray-900">
                      {new Date(match.match_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}
                {match.court_surface && (
                  <div>
                    <span className="text-gray-600">Court: </span>
                    <span className="font-semibold text-gray-900 capitalize">{match.court_surface}</span>
                  </div>
                )}
                {match.duration_minutes && (
                  <div>
                    <span className="text-gray-600">Duration: </span>
                    <span className="font-semibold text-gray-900">{Math.round(match.duration_minutes)} min</span>
                  </div>
                )}
                {match.uploader_notes && (
                  <div>
                    <span className="text-gray-600">Notes: </span>
                    <span className="font-semibold text-gray-900">{match.uploader_notes}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Uploaded: </span>
                  <span className="font-semibold text-gray-900">
                    {new Date(match.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Match Analytics Section - Moved Above Player Stats */}
      {stats ? (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-4">
          <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-xl">📊</span>
            Match Analytics
          </h2>
          {/* Summary Cards - Compact */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg border-2 border-blue-400 p-3 text-white text-center">
              <p className="text-xs font-bold text-blue-100 mb-1">Rallies</p>
              <p className="text-2xl font-black">{stats.total_rallies}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg border-2 border-blue-400 p-3 text-white text-center">
              <p className="text-xs font-bold text-blue-100 mb-1">Longest</p>
              <p className="text-2xl font-black">{stats.longest_rally}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg border-2 border-blue-400 p-3 text-white text-center">
              <p className="text-xs font-bold text-blue-100 mb-1">Duration</p>
              <p className="text-xl font-black">
                {stats.match_duration_minutes ? stats.match_duration_minutes.toFixed(1) : '—'} 
                {stats.match_duration_minutes && <span className="text-sm">min</span>}
              </p>
            </div>
          </div>

          {/* Player Stats - Now Part of Match Analytics */}
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[stats.player1_stats, stats.player2_stats].map((p, idx) => (
                <div
                  key={p.player_number}
                  className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-3"
                >
                  <p className="text-sm font-bold text-gray-700 mb-2">
                    {idx === 0 ? match.player1_name || 'Player 1' : match.player2_name || 'Player 2'}
                  </p>
                  <p className="text-lg font-black text-gray-900 mb-2">
                    {p.points_won}/{p.total_points} Points
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-blue-50 rounded p-1.5">
                      <p className="text-gray-600 text-xs">W</p>
                      <p className="font-black text-gray-900">{p.winners}</p>
                    </div>
                    <div className="bg-red-50 rounded p-1.5">
                      <p className="text-gray-600 text-xs">E</p>
                      <p className="font-black text-gray-900">{p.errors}</p>
                    </div>
                    <div className="bg-green-50 rounded p-1.5">
                      <p className="text-gray-600 text-xs">Cov</p>
                      <p className="font-black text-gray-900">{p.court_coverage?.toFixed(0) || '0'}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : match.status === 'completed' ? (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 text-center">
          <p className="text-sm font-bold text-yellow-900">📊 Analytics processing...</p>
        </div>
      ) : null}

      {/* Videos Section - Blue/Cyan Theme to Complement Green */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-4">
        <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
          <span className="text-xl">🎬</span>
          Match Videos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Highlights Video Card - Compact */}
          <div className="bg-white rounded-lg border-2 border-blue-200 p-3 hover:border-blue-400 transition-all">
            <h3 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-1">
              <span>🎬</span> Highlights
            </h3>
            <div className="flex flex-wrap gap-1 mb-2">
              <span className="px-2 py-0.5 bg-blue-100 rounded text-blue-700 text-xs font-semibold">Winners</span>
              <span className="px-2 py-0.5 bg-blue-100 rounded text-blue-700 text-xs font-semibold">Aces</span>
              <span className="px-2 py-0.5 bg-blue-100 rounded text-blue-700 text-xs font-semibold">Smashes</span>
            </div>
            <div>
              {(() => {
                const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
                const highlightsUrl = token 
                  ? `${API_URL}/videos/matches/${matchId}/highlights-video?token=${token}`
                  : null
                
                const handleHighlightsClick = async () => {
                  if (!highlightsUrl) {
                    alert('Something is wrong, talk to my boss')
                    return
                  }
                  
                  try {
                    const response = await fetch(highlightsUrl, { method: 'HEAD' })
                    if (response.ok) {
                      setVideoModal({
                        isOpen: true,
                        url: highlightsUrl,
                        title: 'Match Highlights'
                      })
                    } else {
                      alert('Something is wrong, talk to my boss')
                    }
                  } catch (error) {
                    alert('Something is wrong, talk to my boss')
                  }
                }
                
                return (
                  <button
                    onClick={handleHighlightsClick}
                    className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-all hover:bg-blue-700 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!token}
                  >
                    <span>▶</span>
                    <span>Watch Highlights</span>
                  </button>
                )
              })()}
            </div>
          </div>

          {/* Full Game Video Card - Compact */}
          <div className="bg-white rounded-lg border-2 border-blue-200 p-3 hover:border-blue-400 transition-all">
            <h3 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-1">
              <span>🎾</span> Full Match
            </h3>
            <div className="flex flex-wrap gap-1 mb-2">
              <span className="px-2 py-0.5 bg-blue-100 rounded text-blue-700 text-xs font-semibold">Full Coverage</span>
              <span className="px-2 py-0.5 bg-blue-100 rounded text-blue-700 text-xs font-semibold">All Points</span>
            </div>
            <div>
              {match.videos && match.videos.length > 0 ? (
                (() => {
                  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
                  const fullVideoUrl = token 
                    ? `${API_URL}/videos/matches/${matchId}/video?token=${token}`
                    : null
                  
                  const handleFullVideoClick = async () => {
                    if (!fullVideoUrl) {
                      return
                    }
                    
                    try {
                      const response = await fetch(fullVideoUrl, { method: 'HEAD' })
                      if (response.ok) {
                        setVideoModal({
                          isOpen: true,
                          url: fullVideoUrl,
                          title: 'Full Match Video'
                        })
                      } else {
                        alert('Something is wrong, talk to my boss')
                      }
                    } catch (error) {
                      alert('Something is wrong, talk to my boss')
                    }
                  }
                  
                  return fullVideoUrl ? (
                    <button
                      onClick={handleFullVideoClick}
                      className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-all hover:bg-blue-700 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!token}
                    >
                      <span>▶</span>
                      <span>Watch Full Game</span>
                    </button>
                  ) : (
                    <div className="text-center py-2 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <p className="text-yellow-800 text-xs font-semibold">Something is wrong, talk to my boss</p>
                    </div>
                  )
                })()
              ) : (
                <div className="text-center py-2 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <p className="text-yellow-800 text-xs font-semibold">Something is wrong, talk to my boss</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      <VideoModal
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal({ isOpen: false, url: '', title: '' })}
        videoUrl={videoModal.url}
        title={videoModal.title}
      />

    </div>
  )
}


'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/lib/api'
import Link from 'next/link'

interface MatchTileProps {
  match: any
  getStatusBadge: (status: string) => string
  getStatusLabel: (status: string) => string
}

export default function MatchTile({ match, getStatusBadge, getStatusLabel }: MatchTileProps) {
  // Fetch analytics preview for completed matches
  const { data: matchStats } = useQuery({
    queryKey: ['matchStatsPreview', match.id],
    queryFn: () => analyticsApi.getMatchStats(match.id),
    enabled: match.status === 'completed',
    retry: false,
    throwOnError: false,
  })

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group bg-gradient-to-br from-white to-green-50 rounded-xl shadow-lg hover:shadow-xl border-2 border-green-200 hover:border-green-400 transition-all duration-300 overflow-hidden hover:-translate-y-1 flex flex-col cursor-pointer"
    >
      {/* Card Header - Tennis Themed */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-3 text-white">
        <h2 className="text-lg font-black mb-1 truncate flex items-center gap-2">
          <span className="text-xl">🎾</span>
          {match.title}
        </h2>
        <p className="text-xs font-bold text-green-100">
          {match.match_type?.toUpperCase() || 'SINGLES'}
        </p>
      </div>

      {/* Card Body - Compact */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-lg">👤</span>
            <div className="text-xs">
              <p className="font-bold text-gray-900">{match.player1_name || 'Player 1'}</p>
              <p className="text-xs text-gray-500 font-semibold">VS</p>
              <p className="font-bold text-gray-900">{match.player2_name || 'Player 2'}</p>
            </div>
          </div>
        </div>

        {/* Event and Date Information */}
        <div className="mb-2 space-y-1 text-xs">
          {match.event && (
            <div className="text-gray-700">
              <span className="font-semibold">🏆</span> {match.event}
            </div>
          )}
          {match.bracket && (
            <div className="text-gray-600">
              <span className="font-semibold">📊</span> {match.bracket}
            </div>
          )}
          {match.event_date && (
            <div className="text-gray-600">
              <span className="font-semibold">📅</span> Event: {new Date(match.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          )}
          {match.created_at && (
            <div className="text-gray-500">
              <span className="font-semibold">⬆️</span> Uploaded: {new Date(match.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </div>

        {/* Analytics Preview */}
        {matchStats && (
          <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <p className="text-xs font-bold text-gray-700 mb-1">📊 Analytics Preview</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">Rallies:</span>
                <span className="font-bold text-gray-900 ml-1">{matchStats.total_rallies}</span>
              </div>
              <div>
                <span className="text-gray-600">P1 Points:</span>
                <span className="font-bold text-gray-900 ml-1">{matchStats.player1_stats.points_won}</span>
              </div>
              <div>
                <span className="text-gray-600">P2 Points:</span>
                <span className="font-bold text-gray-900 ml-1">{matchStats.player2_stats.points_won}</span>
              </div>
              <div>
                <span className="text-gray-600">Longest:</span>
                <span className="font-bold text-gray-900 ml-1">{matchStats.longest_rally}</span>
              </div>
            </div>
          </div>
        )}

        {/* Status and Progress - Compact */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`px-2 py-1 rounded-lg text-xs font-bold border-2 ${getStatusBadge(match.status)}`}>
              {getStatusLabel(match.status)}
            </span>
            {match.processing_progress > 0 && match.processing_progress < 1 && (
              <span className="text-xs font-bold text-gray-600">
                {Math.round(match.processing_progress * 100)}%
              </span>
            )}
          </div>
          {match.processing_progress > 0 && match.processing_progress < 1 && (
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${match.processing_progress * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}


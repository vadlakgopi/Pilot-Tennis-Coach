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
      className="group bg-gradient-to-br from-white to-green-50 rounded-lg shadow-md hover:shadow-lg border border-green-200 hover:border-green-400 transition-all duration-200 overflow-hidden hover:-translate-y-0.5 flex flex-col cursor-pointer"
    >
      {/* Card Header - Compact */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-2 text-white">
        <h2 className="text-sm font-bold mb-0.5 truncate flex items-center gap-1.5">
          <span className="text-lg">🎾</span>
          {match.title}
        </h2>
        <p className="text-xs font-semibold text-green-100">
          {match.match_type?.toUpperCase() || 'SINGLES'}
        </p>
      </div>

      {/* Card Body - Compact Height */}
      <div className="p-2.5 flex-1">
        <div className="mb-1.5">
          <div className="text-xs">
            <p className="font-semibold text-gray-900 truncate">{match.player1_name || 'Player 1'}</p>
            <p className="text-[10px] text-gray-500 font-medium text-center">VS</p>
            <p className="font-semibold text-gray-900 truncate">{match.player2_name || 'Player 2'}</p>
          </div>
        </div>

        {/* Event and Date Information - Compact */}
        {match.event && (
          <div className="mb-1.5 text-xs text-gray-700 truncate">
            <span className="font-semibold">🏆</span> {match.event}
          </div>
        )}

        {/* Analytics Preview - Compact */}
        {matchStats && (
          <div className="mb-1.5 p-1.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded border border-blue-200">
            <p className="text-[10px] font-bold text-gray-700 mb-1">📊 Stats</p>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div>
                <span className="text-gray-600">R:</span>
                <span className="font-bold text-gray-900 ml-0.5">{matchStats.total_rallies}</span>
              </div>
              <div>
                <span className="text-gray-600">P1:</span>
                <span className="font-bold text-gray-900 ml-0.5">{matchStats.player1_stats.points_won}</span>
              </div>
              <div>
                <span className="text-gray-600">P2:</span>
                <span className="font-bold text-gray-900 ml-0.5">{matchStats.player2_stats.points_won}</span>
              </div>
              <div>
                <span className="text-gray-600">L:</span>
                <span className="font-bold text-gray-900 ml-0.5">{matchStats.longest_rally}</span>
              </div>
            </div>
          </div>
        )}

        {/* Status and Progress - Compact */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(match.status)}`}>
              {getStatusLabel(match.status)}
            </span>
            {match.processing_progress > 0 && match.processing_progress < 1 && (
              <span className="text-[10px] font-bold text-gray-600">
                {Math.round(match.processing_progress * 100)}%
              </span>
            )}
          </div>
          {match.processing_progress > 0 && match.processing_progress < 1 && (
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${match.processing_progress * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}


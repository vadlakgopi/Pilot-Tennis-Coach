'use client'

import { useQuery, useQueries } from '@tanstack/react-query'
import { usersApi, matchesApi, analyticsApi } from '@/lib/api'
import AuthGuard from '@/components/auth/AuthGuard'
import Breadcrumbs from '@/components/layout/Breadcrumbs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function SummaryPage() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: usersApi.getProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: () => matchesApi.list(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Fetch stats for all completed matches
  const completedMatches = matches?.filter((match: any) => 
    match.status === 'completed' || match.status === 'COMPLETED'
  ) || []

  const statsQueries = useQueries({
    queries: completedMatches.map((match: any) => ({
      queryKey: ['matchStats', match.id],
      queryFn: () => analyticsApi.getMatchStats(match.id),
      enabled: completedMatches.length > 0,
      retry: false,
      staleTime: 5 * 60 * 1000,
    })),
  })

  // Calculate member since
  const getMemberSince = () => {
    if (!user?.created_at) return 'N/A'
    
    const createdDate = new Date(user.created_at)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - createdDate.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 30) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} ${months === 1 ? 'month' : 'months'}`
    } else {
      const years = Math.floor(diffDays / 365)
      const remainingMonths = Math.floor((diffDays % 365) / 30)
      if (remainingMonths > 0) {
        return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`
      }
      return `${years} ${years === 1 ? 'year' : 'years'}`
    }
  }

  // Count matches
  const totalMatches = matches?.length || 0
  const analyzedMatches = completedMatches.length

  // Calculate additional statistics
  const calculateMatchStats = () => {
    if (!matches || completedMatches.length === 0) {
      return {
        mostShots: null,
        mostWinners: null,
        longestMatch: null,
      }
    }

    // Get all stats data
    const matchStatsMap = new Map()
    statsQueries.forEach((query, index) => {
      if (query.data && completedMatches[index]) {
        matchStatsMap.set(completedMatches[index].id, {
          match: completedMatches[index],
          stats: query.data,
        })
      }
    })

    // Find match with most total shots
    let mostShots = null
    let maxShots = 0
    matchStatsMap.forEach(({ match, stats }) => {
      // Calculate total shots from player stats if total_shots not available
      let totalShots = stats.total_shots || 0
      if (totalShots === 0 && stats.player1_stats && stats.player2_stats) {
        // Sum up shots from shot_distribution if available
        const p1Shots = stats.player1_stats.shot_distribution 
          ? Object.values(stats.player1_stats.shot_distribution).reduce((sum: number, val: any) => sum + (val || 0), 0)
          : 0
        const p2Shots = stats.player2_stats.shot_distribution
          ? Object.values(stats.player2_stats.shot_distribution).reduce((sum: number, val: any) => sum + (val || 0), 0)
          : 0
        totalShots = p1Shots + p2Shots
      }
      if (totalShots > maxShots) {
        maxShots = totalShots
        mostShots = { match, value: totalShots }
      }
    })

    // Find match with most winners
    let mostWinners = null
    let maxWinners = 0
    matchStatsMap.forEach(({ match, stats }) => {
      const totalWinners = (stats.player1_stats?.winners || 0) + (stats.player2_stats?.winners || 0)
      if (totalWinners > maxWinners) {
        maxWinners = totalWinners
        mostWinners = { match, value: totalWinners }
      }
    })

    // Find longest match (by duration_minutes)
    let longestMatch = null
    let maxDuration = 0
    matches.forEach((match: any) => {
      const duration = match.duration_minutes || 0
      if (duration > maxDuration) {
        maxDuration = duration
        longestMatch = { match, value: duration }
      }
    })

    return { mostShots, mostWinners, longestMatch }
  }

  const additionalStats = calculateMatchStats()
  const isLoadingStats = statsQueries.some(query => query.isLoading)

  if (userLoading || matchesLoading) {
    return (
      <AuthGuard>
        <div className="container mx-auto px-4 py-6 h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-6 h-[calc(100vh-8rem)] flex flex-col overflow-y-auto">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Summary' }]} />
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Statistics</h1>
          <p className="text-gray-600">Overview of your tennis analytics journey</p>
        </div>

        {/* Basic Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Member Since */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200 shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center text-2xl">
                👤
              </div>
              <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Member Since</h3>
            </div>
            <p className="text-3xl font-bold text-blue-700">{getMemberSince()}</p>
          </div>

          {/* Matches Uploaded */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-6 border border-green-200 shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-green-500 flex items-center justify-center text-2xl">
                📤
              </div>
              <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Matches Uploaded</h3>
            </div>
            <p className="text-3xl font-bold text-green-700">{totalMatches}</p>
          </div>

          {/* Matches Analyzed */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl p-6 border border-purple-200 shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center text-2xl">
                ✅
              </div>
              <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Matches Analyzed</h3>
            </div>
            <p className="text-3xl font-bold text-purple-700">{analyzedMatches}</p>
          </div>
        </div>

        {/* Match Records */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Match Records</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Match with Most Total Shots */}
            <div className="bg-gradient-to-br from-orange-50 to-red-100 rounded-xl p-6 border border-orange-200 shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center text-2xl">
                  🎯
                </div>
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Most Total Shots</h3>
              </div>
              {isLoadingStats ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                </div>
              ) : additionalStats.mostShots ? (
                <>
                  <p className="text-3xl font-bold text-orange-700 mb-2">{additionalStats.mostShots.value.toLocaleString()}</p>
                  <p className="text-sm text-gray-700 mb-3 truncate">{additionalStats.mostShots.match.title}</p>
                  <Link href={`/matches/${additionalStats.mostShots.match.id}`}>
                    <Button size="sm" className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                      View Match →
                    </Button>
                  </Link>
                </>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>

            {/* Match with Most Winners */}
            <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl p-6 border border-yellow-200 shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-yellow-500 flex items-center justify-center text-2xl">
                  ⭐
                </div>
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Most Winners</h3>
              </div>
              {isLoadingStats ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
                </div>
              ) : additionalStats.mostWinners ? (
                <>
                  <p className="text-3xl font-bold text-yellow-700 mb-2">{additionalStats.mostWinners.value.toLocaleString()}</p>
                  <p className="text-sm text-gray-700 mb-3 truncate">{additionalStats.mostWinners.match.title}</p>
                  <Link href={`/matches/${additionalStats.mostWinners.match.id}`}>
                    <Button size="sm" className="w-full bg-yellow-600 hover:bg-yellow-700 text-white">
                      View Match →
                    </Button>
                  </Link>
                </>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>

            {/* Longest Match */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-100 rounded-xl p-6 border border-teal-200 shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-teal-500 flex items-center justify-center text-2xl">
                  ⏱️
                </div>
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Longest Match</h3>
              </div>
              {additionalStats.longestMatch ? (
                <>
                  <p className="text-3xl font-bold text-teal-700 mb-2">
                    {Math.round(additionalStats.longestMatch.value)} min
                  </p>
                  <p className="text-sm text-gray-700 mb-3 truncate">{additionalStats.longestMatch.match.title}</p>
                  <Link href={`/matches/${additionalStats.longestMatch.match.id}`}>
                    <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                      View Match →
                    </Button>
                  </Link>
                </>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}


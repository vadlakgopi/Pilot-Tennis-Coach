'use client'

import { useQuery } from '@tanstack/react-query'
import { matchesApi } from '@/lib/api'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import StatusExplanation from '@/components/match/StatusExplanation'
import MatchTile from '@/components/match/MatchTile'
// import VideoPreviewModal from '@/components/match/VideoPreviewModal' // Disabled for now
import Breadcrumbs from '@/components/layout/Breadcrumbs'

export default function MatchesPage() {
  // const [previewMatchId, setPreviewMatchId] = useState<number | null>(null) // Disabled for now
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<string>('desc')
  
  const { data: matches, isLoading, error } = useQuery({
    queryKey: ['matches', sortBy, sortOrder],
    queryFn: async () => {
      console.log('Fetching matches with sortBy:', sortBy, 'sortOrder:', sortOrder)
      const result = await matchesApi.list(sortBy, sortOrder)
      console.log('Matches API returned:', result)
      return result
    },
    retry: 1,
    retryDelay: 1000,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // Refetch on component mount
  })

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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading matches...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isAuthError = errorMessage.includes('401') || errorMessage.includes('Unauthorized')
    
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Matches</h2>
          {isAuthError ? (
            <>
              <p className="text-red-700 mb-4">Please log in to view your matches.</p>
              <Link href="/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Go to Login
                </Button>
              </Link>
            </>
          ) : (
            <p className="text-red-700">Please try again later or check your connection.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Matches' }]} />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-1 flex items-center gap-2">
            <span className="text-3xl">🎾</span>
            My Matches
          </h1>
          <p className="text-sm text-gray-600 mb-1">
            {matches?.length || 0} {matches?.length === 1 ? 'match' : 'matches'} total
          </p>
          <StatusExplanation />
        </div>
        <div className="flex items-center gap-3">
          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="created_at">Upload Date</option>
              <option value="event_date">Event Date</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
          <Link href="/upload">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white shadow-lg font-bold px-4 py-2">
              <span className="mr-2">📤</span>
              Upload Match
            </Button>
          </Link>
        </div>
      </div>

      {!matches || matches.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-dashed border-green-300">
          <div className="text-5xl mb-3">🎾</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No matches yet</h2>
          <p className="text-sm text-gray-600 mb-4">Upload your first match video to get started!</p>
          <Link href="/upload">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold">
              Upload Your First Match
            </Button>
          </Link>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${matches.length <= 3 ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-4 max-h-[calc(100vh-200px)] ${matches.length > 4 ? 'overflow-y-auto' : ''}`}>
          {matches.map((match: any) => (
            <MatchTile
              key={match.id}
              match={match}
              getStatusBadge={getStatusBadge}
              getStatusLabel={getStatusLabel}
            />
          ))}
        </div>
      )}

      {/* Video Preview Modal - Disabled for now */}
      {/* {previewMatchId && (
        <VideoPreviewModal
          matchId={previewMatchId}
          isOpen={!!previewMatchId}
          onClose={() => setPreviewMatchId(null)}
        />
      )} */}
    </div>
  )
}


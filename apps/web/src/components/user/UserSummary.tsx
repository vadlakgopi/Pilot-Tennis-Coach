'use client'

import { useQuery } from '@tanstack/react-query'
import { usersApi, matchesApi } from '@/lib/api'

export default function UserSummary() {
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

  if (userLoading || matchesLoading) {
    return (
      <div className="flex items-center justify-center py-5">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600"></div>
      </div>
    )
  }

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
  // Match status can be 'completed' (from API) or 'COMPLETED' (enum value)
  const analyzedMatches = matches?.filter((match: any) => 
    match.status === 'completed' || match.status === 'COMPLETED'
  ).length || 0

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Member Since */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-4 border border-blue-200 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-xl">
              👤
            </div>
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Member Since</h3>
          </div>
          <p className="text-2xl font-bold text-blue-700">{getMemberSince()}</p>
        </div>

        {/* Matches Uploaded */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-4 border border-green-200 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center text-xl">
              📤
            </div>
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Uploaded</h3>
          </div>
          <p className="text-2xl font-bold text-green-700">{totalMatches}</p>
        </div>

        {/* Matches Analyzed */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-lg p-4 border border-purple-200 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center text-xl">
              ✅
            </div>
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">Analyzed</h3>
          </div>
          <p className="text-2xl font-bold text-purple-700">{analyzedMatches}</p>
        </div>
      </div>
    </div>
  )
}

